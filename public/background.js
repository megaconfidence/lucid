if (chrome.sidePanel) {
	// Chrome: open side panel when clicking the extension icon
	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
} else {
	// Firefox: toggle sidebar when clicking the extension icon
	chrome.action.onClicked.addListener(() => browser.sidebarAction.toggle());
}
