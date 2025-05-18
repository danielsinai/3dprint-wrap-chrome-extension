// Background script for the 3D Print Wrap Importer extension

// Listen for installation
chrome.runtime.onInstalled.addListener(function() {
  console.log('3D Print Wrap Importer extension installed');
});

// Optional: Add context menu functionality
chrome.contextMenus.create({
  id: "extractPrintData",
  title: "Extract 3D Print Data",
  contexts: ["page"],
  documentUrlPatterns: ["*://*.makerworld.com/*"]
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "extractPrintData") {
    chrome.tabs.sendMessage(tab.id, {action: "extract"}, function(response) {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError.message);
        return;
      }
      
      if (response && response.success) {
        // Store the extracted data
        chrome.storage.local.set({printData: response.data}, function() {
          // Build the redirect URL
          const baseUrl = 'https://app.3dprintwrap.com';
          const queryParams = new URLSearchParams();
          
          // Add data as query parameters
          if (response.data.printTime) queryParams.append('printTime', response.data.printTime);
          if (response.data.weight) queryParams.append('weight', response.data.weight);
          if (response.data.nozzleSize) queryParams.append('nozzleSize', response.data.nozzleSize);
          
          // Add filaments data
          if (response.data.filaments && response.data.filaments.length > 0) {
            queryParams.append('filamentsData', JSON.stringify(response.data.filaments));
          }
          
          // Add image URL if available
          if (response.data.imageUrl) queryParams.append('imageUrl', response.data.imageUrl);
          
          // Open the 3D Print Wrap app with the data
          chrome.tabs.create({url: `${baseUrl}?${queryParams.toString()}`});
        });
      } else {
        console.error('Failed to extract data');
      }
    });
  }
});

// When the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  // Check if we're on makerworld.com
  if (tab.url.includes('makerworld.com')) {
    // Execute a script to indicate that the extension is working
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: showNotification
    });
  } else {
    // If not on makerworld, open the website
    chrome.tabs.create({ url: 'https://makerworld.com' });
  }
});

// Function to show a notification to the user
function showNotification() {
  // Create a notification element
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.left = '50%';
  notification.style.transform = 'translateX(-50%)';
  notification.style.zIndex = '9999';
  notification.style.backgroundColor = '#4CAF50';
  notification.style.color = 'white';
  notification.style.padding = '15px 20px';
  notification.style.borderRadius = '8px';
  notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
  notification.style.fontFamily = 'Arial, sans-serif';
  notification.style.fontSize = '16px';
  notification.style.fontWeight = 'bold';
  notification.style.textAlign = 'center';
  
  // Add message
  notification.textContent = 'Looking for Print Plates dialog... When you open it, a "Copy print to 3dprintwrap" button will appear.';
  
  // Add to page
  document.body.appendChild(notification);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 500);
  }, 5000);
} 