var settings = (function(localStorage) {
  var defaults = {
    extensionActive: true,
    playNext: true,
    autoPlay: true,
    jumpToPlayer: true,
    autoPlayJumpToPlayer: true,
    rightClickRedirect: false,
    skipBrokenVideos: true,
    enableAutoQuality: false,
    autoQuality: 720
    //extendPlaylist: true,
  }, activeSettings = {};

  for (var key in defaults) {
    var val = localStorage.getItem(key);
    activeSettings[key] = val !== null ? JSON.parse(val) : defaults[key];
    console.log('Setting "'+key+'" is set to "'+activeSettings[key]+'"');
  }

  return {
    set: function(key, value) {
      if (activeSettings.hasOwnProperty(key)) {
        activeSettings[key] = value;
        console.log('Setting "'+key+'" to '+JSON.stringify(value));
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      }
      return false;
    },

    toggle: function(key) {
      var oldValue = this.get(key);
      if (typeof oldValue == 'boolean') {
        return this.set(key, !(oldValue));
      } else throw('Setting "'+key+'" is not boolean.');
    },

    get: function(key) {
      if (activeSettings.hasOwnProperty(key)) {
        return activeSettings[key];
      } else throw('Could not get setting "'+key+'"');
    },

    getAll: function() {
      return activeSettings;
    },

    clear: function() {
      localStorage.clear();
      for (var key in defaults) {
        activeSettings[key] = defaults[key];
      }
    }
  };
})(localStorage);