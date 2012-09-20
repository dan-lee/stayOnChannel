var settings = (function(localStorage) {
  var defaults = {
    extensionActive: true,
    autoPlay: true,
    jumpToPlayer: true,
    rightClickRedirect: true
  }, activeSettings = {};

  for (var key in defaults) {
    if (defaults.hasOwnProperty(key)) {
      var val = localStorage.getItem(key);
      activeSettings[key] = val !== null ? JSON.parse(val) : defaults[key];
      console.log('Setting "',key,'" is set to "',activeSettings[key],'"');
    }
  }

  return {
    set: function(key, value) {
      if (activeSettings.hasOwnProperty(key)) {
        activeSettings[key] = value;
        console.log('Setting "',key,'" to ',JSON.stringify(value));
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      }
      return false;
    },

    toggle: function(key) {
      var oldValue = this.get(key);
      if (typeof oldValue == 'boolean') {
        return this.set(key, !(oldValue));
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

var communicator = (function() {
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
    notify: function(event, message, callback) {
      var notification = { event: event, message: message  };
      for(var i = 0, len = channelTabs.length; i < len; i++) {
        chrome.tabs.sendMessage(channelTabs[i], notification, callback);
      }
    },

    on: function(event, callback) {
      chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
        if (request == event) {
          sendResponse(callback());
        }
      });
    }
  };
})();

communicator.on('allSettings', function() {
  return settings.getAll();
});

var iconPath = 'icons/';
var iconActive = 'icon19_red.png';
var iconInactive = 'icon19_grey.png';

var currentIcon = settings.get('extensionActive') ? iconActive : iconInactive;
chrome.browserAction.setIcon({ path: iconPath + currentIcon });
console.log('set icon to '+currentIcon, settings.get('extensionActive'));

chrome.browserAction.onClicked.addListener(function() {
  if (settings.toggle('extensionActive')) {
    var currentIcon = settings.get('extensionActive') ? iconActive : iconInactive;
    chrome.browserAction.setIcon({ path: iconPath + currentIcon });
    console.log('set icon to '+currentIcon, settings.get('extensionActive'));

    communicator.notify('refreshSettings', settings.getAll());
  }
});