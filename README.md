# 3D Print Wrap Chrome Extension

A Chrome extension that extracts 3D print data from makerworld.com and imports it directly to app.3dprintwrap.com.

## Features

- Extracts print time, weight, and nozzle size information
- Extracts filament details (material type, color, and weight)
- Captures the print image
- Redirects to app.3dprintwrap.com with the extracted data

## Installation

1. Clone this repository or download it as a ZIP file
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top right corner
4. Click "Load unpacked" and select the directory containing this extension
5. The extension should now be installed and visible in your Chrome toolbar

## Usage

1. Navigate to a 3D print page on makerworld.com
2. Click the 3D Print Wrap Importer extension icon in your toolbar
3. Click the "Extract Print Data" button
4. The extension will extract the data and redirect you to app.3dprintwrap.com with the data pre-filled

Alternatively, you can right-click anywhere on the makerworld.com page and select "Extract 3D Print Data" from the context menu.

## Development

### Extension Structure

- `manifest.json` - Extension configuration
- `popup.html` - Extension popup UI
- `popup.js` - Handles popup interaction
- `content.js` - Extracts data from the makerworld.com page
- `background.js` - Background service worker for the extension

### Adding Icons

Replace the placeholder icon files in the `images` directory with your own icons:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

## License

MIT
