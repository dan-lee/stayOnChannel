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
        this.activeSettings[key] = localStorage.getItem(key) || this.defaults[key];
      }
    }
  },

  set: function(key, value) {
    if (this.activeSettings.hasOwnProperty(key)) {
      this.activeSettings[key] = value
      localStorage.setItem(key, value);
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

chrome.extension.onConnect.addListener(main);
// connection to the extension established, process further..
function main(port) {
  port.onMessage.addListener(function(msg) {
    port.postMessage({ getAllSettings: Settings.getAll() });
  });

  chrome.browserAction.onClicked.addListener(toggleStatus);

  function toggleStatus() {
    var iconPath = 'icons/';
    var iconActive = 'icon19_red.png';
    var iconInactive = 'icon19_grey.png';

    if (Settings.toggle('extensionActive')) {
      var currentIcon = Settings.get('extensionActive') ? iconActive : iconInactive;
      chrome.browserAction.setIcon({ path: iconPath + currentIcon });
      //chrome.tabs.postMessage({ settingsUpdate: Settings.getAll() }, activeTabs);

      port.postMessage({ getAllSettings: Settings.getAll() });
    }
  }
}