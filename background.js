var settings = (function(localStorage) {
  var defaults = {
    extensionActive: true,
    autoPlay: true,
    jumpToPlayer: true,
    rightClickRedirect: true
  }, activeSettings = {};

  for (var key in defaults) {
    if (defaults.hasOwnProperty(key)) {
      activeSettings[key] = localStorage.getItem(key) || defaults[key];
    }
  }

  return {
    set: function(key, value) {
      if (activeSettings.hasOwnProperty(key)) {
        activeSettings[key] = value;
        localStorage.setItem(key, value);
        return true;
      }
      return false;
    },

    toggle: function(key) {
      var oldValue = get(key);
      if (typeof oldValue == 'boolean') {
        return set(key, !(oldValue));
      } else throw(key + ' setting is not boolean.');
    },

    get: function(key) {
      if (activeSettings.hasOwnProperty(key)) {
        return activeSettings[key];
      } else throw('Could not get setting '+key);
    },

    getAll: function() {
      return activeSettings;
    }
  };
})(localStorage);

/*var extensionIO = (function() {
  var channelTabs = [];

  chrome.extension.onConnect.addListener(function(port) {
    var tabId = port.tab.id;
    // add tab when opened
    if (channelTabs.indexOf(tabId) == -1) {
      channelTabs.push(tabId);
    }

    // remove when closed/directed to another url
    port.onDisconnect.addListener(function() {
      channelTabs.splice(channelTabs.indexOf(tabId), 1);
    });
  });

  return {
    send: function(callback) {
      for(var i = 0, len = channelTabs.length; i < len; i++) {
        chrome.tabs.sendMessage(channelTabs[i], msg, function() {
          callback && callback();
        });
      }
    },

    on: function(what, callback) {
      var that;
      chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.hasOwnProperty(what)) {
          callback.call(that);
        }
      });
    }
  };
})();*/

extensionIO.on('getAllSettings', function() {
  //this.send({ getAllSettings: settings.getAll() });
  extensionIO.send({ getAllSettings: settings.getAll() });
});

var tabs = [];
chrome.extension.onConnect.addListener(function(port) {
  var id = port.tab.id;
  if (tabs.indexOf(id) == -1) {
    tabs.push(id);
  }
  port.onDisconnect.addListener(function() {
    tabs.splice(tabs.indexOf(id), 1);
  });
});


chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.getAllSettings) {
    sendMessage({ getAllSettings: settings.getAll() });
  }
});

function sendMessage(msg) {
  for(var i = 0, len = tabs.length; i < len; i++) {
    chrome.tabs.sendMessage(tabs[i], msg, function() {});
  }
}


chrome.browserAction.onClicked.addListener(toggleStatus);

function toggleStatus() {
  var iconPath = 'icons/';
  var iconActive = 'icon19_red.png';
  var iconInactive = 'icon19_grey.png';

  if (settings.toggle('extensionActive')) {
    var currentIcon = settings.get('extensionActive') ? iconActive : iconInactive;
    chrome.browserAction.setIcon({ path: iconPath + currentIcon });

    sendMessage({ getAllSettings: settings.getAll() });
    //extensionIO.sendMessage({ getAllSettings: Settings.getAll() });
  }
}