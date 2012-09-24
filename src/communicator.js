var communicator = (function() {
  // let the background know that the content script is alive
  var port = chrome.extension.connect();

  // public
  return {
    request: function(message, callback) {
      chrome.extension.sendMessage(message, function(response) {
        callback(response);
      });
    },

    on: function(event, callback) {
      chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.event == event) {
          callback.call(this, request.message);
          sendResponse && sendResponse(request.message);
        }
      });
    }
  }
})();