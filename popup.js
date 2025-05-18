document.addEventListener('DOMContentLoaded', function() {
  const extractBtn = document.getElementById('extractBtn');
  const statusDiv = document.getElementById('status');
  
  // Check if we're on a makerworld.com page
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentUrl = tabs[0].url;
    if (!currentUrl.includes('makerworld.com')) {
      extractBtn.disabled = true;
      statusDiv.textContent = 'Please navigate to a makerworld.com print page to use this extension.';
      statusDiv.className = 'status error';
      statusDiv.style.display = 'block';
    }
  });
  
  // Extract button click handler
  extractBtn.addEventListener('click', function() {
    extractBtn.disabled = true;
    statusDiv.textContent = 'Extracting data...';
    statusDiv.className = 'status';
    statusDiv.style.display = 'block';
    
    // Call content script to extract the data
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "extract"}, function(response) {
        if (chrome.runtime.lastError) {
          statusDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
          statusDiv.className = 'status error';
          extractBtn.disabled = false;
          return;
        }
        
        if (response && response.success) {
          statusDiv.textContent = 'Data extracted! Redirecting to 3D Print Wrap...';
          statusDiv.className = 'status success';
          
          // Store the extracted data
          chrome.storage.local.set({printData: response.data}, function() {
            // Redirect to app.3dprintwrap.com with the extracted data
            const redirectUrl = buildRedirectUrl(response.data);
            chrome.tabs.create({url: redirectUrl});
          });
        } else {
          statusDiv.textContent = 'Failed to extract data. Please try again.';
          statusDiv.className = 'status error';
          extractBtn.disabled = false;
        }
      });
    });
  });
  
  // Build redirect URL with extracted data
  function buildRedirectUrl(data) {
    const baseUrl = 'https://app.3dprintwrap.com';
    const queryParams = new URLSearchParams();
    
    // Add data as query parameters
    if (data.printTime) queryParams.append('printTime', data.printTime);
    if (data.weight) queryParams.append('weight', data.weight);
    if (data.nozzleSize) queryParams.append('nozzleSize', data.nozzleSize);
    
    // Add filaments data
    if (data.filaments && data.filaments.length > 0) {
      queryParams.append('filamentsData', JSON.stringify(data.filaments));
    }
    
    // Add image URL if available
    if (data.imageUrl) queryParams.append('imageUrl', data.imageUrl);
    
    // Build full URL
    return `${baseUrl}?${queryParams.toString()}`;
  }
}); 