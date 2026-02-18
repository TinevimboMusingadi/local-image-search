/**
 * Preload script for security - runs in renderer before page loads.
 * Context bridge can be added here if needed.
 */
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});
