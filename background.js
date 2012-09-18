var Settings = {
  defaults: {
    extensionActive: true,
    autoPlay: true,
    jumpToPlayer: true,
    rightClickRedirect: true
  },

  activeSettings: {},

  init: function() {
    for (var key in this.defaults) {
      if (this.defaults.hasOwnProperty(key)) {
        this.activeSettings[key] = localStorage[key] || this.defaults[key];
      }
    }
  },

  set: function(key, value) {
    if (this.activeSettings.hasOwnProperty(key)) {
      localStorage[key] = this.activeSettings[key] = value;
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
    if (this.activeSettings.hasOwnProperty(key)) {
      return this.activeSettings[key];
    } else throw('Could not get setting '+key);
  },

  getAll: function() {
    return this.activeSettings;
  }
};
Settings.init();

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
  var response = false;
  if (request.getAllSettings) {
    response = Settings.getAll();
  } else if (request.set && request.toggle) {
    response = Settings.toggle(request.set);
  }
  sendResponse({ value: response });
});

var activeTabs = [];
chrome.extension.onConnect.addListener(function(port) {
  activeTabs.push(port.tab.id);

  // remove tab id after closing tab
  port.onDisconnect.addListener(function(port) {
    var index = activeTabs.indexOf(port.tab.id);
    if (index != -1) {
      activeTabs.splice(index, 1);
    }
  });
});

function toggleStatus() {
  var iconPath = 'icons/';
  var iconActive = 'icon19_red.png';
  var iconInactive = 'icon19_grey.png';

  if (Settings.toggle('extensionActive')) {
    var currentIcon = Settings.get('extensionActive') ? iconActive : iconInactive;
    chrome.browserAction.setIcon({ path: iconPath + currentIcon });

    for (var i = 0, len = activeTabs.length; i < len; i++) {
      chrome.tabs.sendRequest(activeTabs[i], { settingsUpdate: Settings.getAll() }, function() {});
    }
  }
}
chrome.browserAction.onClicked.addListener(toggleStatus);