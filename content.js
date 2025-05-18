// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "extract") {
    try {
      const extractedData = extractPrintData();
      sendResponse({ success: true, data: extractedData });
    } catch (error) {
      console.error('Extraction error:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep the message channel open for the async response
  }
});

// Main function to initialize the extension
function initExtension() {
  // Start observing for the Print Plates dialog
  observeForPrintPlatesDialog();
}

// Set up a mutation observer to detect when the Print Plates dialog appears
function observeForPrintPlatesDialog() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        checkAndInjectButton();
      }
    }
  });

  // Observe the entire document for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Check immediately in case the dialog is already open
  checkAndInjectButton();
  
  // Also check periodically (as a fallback)
  setInterval(checkAndInjectButton, 1000);
}

// Check for the dialog and inject button if needed
function checkAndInjectButton() {
  // Target specifically the Print Plates dialog
  const dialogs = document.querySelectorAll('.MuiDialog-paper');
  
  for (const dialog of dialogs) {
    // Check if this is the Print Plates dialog
    const titleElement = dialog.querySelector('.MuiDialogTitle-root p');
    if (titleElement && titleElement.textContent.includes('Print Plates') && 
        !dialog.querySelector('#copy-to-3dprintwrap-btn')) {
      // Find the dialog content where we'll add our button
      const dialogContent = dialog.querySelector('.MuiDialogContent-root');
      if (dialogContent) {
        injectCopyButton(dialog, dialogContent);
        console.log('3DPrintWrap: Button injected successfully');
      }
    }
  }
}

// Inject our custom button into the Print Plates dialog
function injectCopyButton(dialogContainer, targetElement) {
  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.margin = '15px 0';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'center';
  buttonContainer.style.width = '100%';
  
  // Create button
  const button = document.createElement('button');
  button.id = 'copy-to-3dprintwrap-btn';
  button.textContent = 'Copy print to 3dprintwrap';
  button.style.padding = '10px 20px';
  button.style.backgroundColor = '#4CAF50';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  button.style.fontSize = '16px';
  button.style.fontWeight = 'bold';
  button.style.width = '80%';
  
  // Add hover effect
  button.addEventListener('mouseover', () => {
    button.style.backgroundColor = '#45a049';
  });
  
  button.addEventListener('mouseout', () => {
    button.style.backgroundColor = '#4CAF50';
  });
  
  // Add click handler
  button.addEventListener('click', () => {
    const extractedData = extractPrintData(dialogContainer);
    if (extractedData) {
      redirectToApp(extractedData);
    }
  });
  
  // Add button to container and append to dialog content
  buttonContainer.appendChild(button);
  targetElement.appendChild(buttonContainer);
  
  // Log to console for debugging
  console.log('3DPrintWrap: Button created', button);
}

// Extract print data from the dialog and page
function extractPrintData(dialogContainer) {
  try {
    // Extract print times from all plates
    let totalPrintMinutes = 0;
    let totalWeight = 0;
    let nozzleSize = null;
    const allPlates = dialogContainer.querySelectorAll('.mw-css-8atqhb');
    
    // Extract filaments data and collect weights across all plates
    const filamentsMap = new Map(); // Map to store total weights by material and color
    
    allPlates.forEach(plate => {
      // Get print time for this plate
      const timeSpan = plate.querySelector('.config_info .mw-css-18oolko:first-child span');
      if (timeSpan) {
        const timeText = timeSpan.textContent.trim();
        // Parse time (handles both "X h Y min" and "Z min" formats)
        let minutes = 0;
        if (timeText.includes('h')) {
          // Format: "X h Y min" or "X h" (X can include decimals)
          const hourMatch = timeText.match(/(\d+(?:\.\d+)?)\s*h/);
          const minuteMatch = timeText.match(/(\d+)\s*min/);
          
          if (hourMatch) minutes += parseFloat(hourMatch[1]) * 60;
          if (minuteMatch) minutes += parseInt(minuteMatch[1]);
        } else if (timeText.includes('min')) {
          // Format: "Z min"
          const minuteMatch = timeText.match(/(\d+)\s*min/);
          if (minuteMatch) minutes = parseInt(minuteMatch[1]);
        }
        
        totalPrintMinutes += minutes;
      }
      
      // Get weight for this plate
      const weightSpan = plate.querySelector('.config_info .mw-css-18oolko:nth-child(2) span');
      if (weightSpan) {
        const weightText = weightSpan.textContent.trim();
        const weightMatch = weightText.match(/(\d+)\s*g/);
        if (weightMatch) {
          const weight = parseInt(weightMatch[1]);
          totalWeight += weight;
        }
      }
      
      // Get nozzle size (should be the same for all plates, so we'll just use the last one)
      const nozzleSizeSpan = plate.querySelector('.config_info .mw-css-18oolko:nth-child(3) span');
      if (nozzleSizeSpan) {
        nozzleSize = nozzleSizeSpan.textContent.trim();
      }
      
      // Get filaments for this plate
      const filamentElements = plate.querySelectorAll('.filaments_info .mw-css-sbssk2');
      filamentElements.forEach(element => {
        // Get the background color (representing filament color)
        const style = element.getAttribute('style');
        let color = '';
        if (style) {
          const bgColorMatch = style.match(/background:\s*([^;]+)/);
          if (bgColorMatch && bgColorMatch[1]) {
            color = bgColorMatch[1].trim();
          }
        }
        
        // Get the material type and weight
        const materialElement = element.querySelector('.mw-css-bg3st0');
        const weightElement = element.querySelector('.mw-css-1qxtz39');
        
        const material = materialElement ? materialElement.textContent.replace('｜', '').trim() : '';
        const filamentWeightText = weightElement ? weightElement.textContent.trim() : '';
        const filamentWeightMatch = filamentWeightText.match(/(\d+)\s*g/);
        const filamentWeight = filamentWeightMatch ? parseInt(filamentWeightMatch[1]) : 0;
        
        // Use the material and color as a composite key
        const key = `${material}|${color}`;
        if (filamentsMap.has(key)) {
          filamentsMap.set(key, {
            material,
            color,
            weight: filamentsMap.get(key).weight + filamentWeight
          });
        } else {
          filamentsMap.set(key, {
            material,
            color,
            weight: filamentWeight
          });
        }
      });
    });
    
    // Convert the total minutes to hours and minutes
    let printTime = '';
    if (totalPrintMinutes >= 60) {
      const hours = Math.floor(totalPrintMinutes / 60);
      const minutes = totalPrintMinutes % 60;
      printTime = minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
    } else {
      printTime = `${totalPrintMinutes} min`;
    }
    
    // Convert the filaments map to an array
    const filaments = Array.from(filamentsMap.values()).map(item => ({
      material: item.material,
      weight: `${item.weight} g`,
      color: item.color
    }));

    // Extract title from the page
    let title = '';
    const titleElement = document.querySelector('h1.title-for-share');
    if (titleElement) {
      title = titleElement.textContent.trim();
    }

    // Extract main image (first image in the swiper)
    let mainImageUrl = '';
    const mainImageElement = document.querySelector('.swiper-slide.swiper-slide-active img');
    if (mainImageElement) {
      mainImageUrl = mainImageElement.getAttribute('src');
    }
    
    // If no main image found, try the first image in any swiper
    if (!mainImageUrl) {
      const firstImage = document.querySelector('.swiper-slide img');
      if (firstImage) {
        mainImageUrl = firstImage.getAttribute('src');
      }
    }

    // Get the current page URL
    const pageUrl = window.location.href;
    
    // Get the number of plates
    const plateCount = allPlates.length;
    
    console.log('3DPrintWrap: Extracted data', {
      title, 
      mainImageUrl, 
      pageUrl, 
      printTime, 
      totalWeight: `${totalWeight} g`, 
      nozzleSize, 
      filaments,
      plateCount
    });
    
    return {
      title: title,
      imageUrl: mainImageUrl,
      pageUrl: pageUrl,
      printTime: printTime,
      weight: `${totalWeight} g`,
      nozzleSize: nozzleSize,
      filaments: filaments,
      plateCount: plateCount
    };
  } catch (error) {
    console.error('3DPrintWrap Error extracting print data:', error);
    return null;
  }
}

// Redirect to app.3dprintwrap.com with the extracted data
function redirectToApp(data) {
  const baseUrl = 'https://app.3dprintwrap.com/queue';
  const queryParams = new URLSearchParams();
  
  // Add data as query parameters
  if (data.title) queryParams.append('title', data.title);
  if (data.printTime) queryParams.append('printTime', data.printTime);
  if (data.weight) queryParams.append('weight', data.weight);
  if (data.nozzleSize) queryParams.append('nozzleSize', data.nozzleSize);
  
  // Add filaments data
  if (data.filaments && data.filaments.length > 0) {
    queryParams.append('filamentsData', JSON.stringify(data.filaments));
  }
  
  // Add image URL and page URL
  if (data.imageUrl) queryParams.append('imageUrl', data.imageUrl);
  if (data.pageUrl) queryParams.append('pageUrl', data.pageUrl);
  
  console.log('3DPrintWrap: Redirecting to', `${baseUrl}?${queryParams.toString()}`);
  
  // Open the 3D Print Wrap app with the data
  window.open(`${baseUrl}?${queryParams.toString()}`, '_blank');
}

// Initialize the extension
console.log('3DPrintWrap: Extension initialized');
initExtension(); 