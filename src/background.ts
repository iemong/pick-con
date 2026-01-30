chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.tabs.sendMessage(tab.id, { type: "PICK_CON_TOGGLE" })
  }
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PICK_CON_CAPTURE") {
    chrome.tabs
      .captureVisibleTab({ format: "png" })
      .then((dataUrl) => {
        sendResponse({ success: true, dataUrl })
      })
      .catch((error) => {
        sendResponse({ success: false, error: String(error) })
      })
    return true // keep channel open for async response
  }
})
