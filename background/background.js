// settings were request by content script. now deliver!
communicator.on('allSettings', function() {
  return settings.getAll();
});

var toggleIcons = ['icon19_grey.png', 'icon19_red.png'];
var getCurrentIcon = function(toggle) {
  // if param toggle is true
  toggle && settings.toggle('extensionActive');

  // neat trick: preceeding '+' converts bool to int. this represents the index in toggleIcons
  var icon = toggleIcons[+settings.get('extensionActive')];
  return 'icons/' + icon;
};

chrome.browserAction.setIcon({ path: getCurrentIcon() });

chrome.browserAction.onClicked.addListener(function() {
  chrome.browserAction.setIcon({ path: getCurrentIcon(true) });
  communicator.notify('refreshSettings', settings.getAll());
});