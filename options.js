window.addEventListener('load', main);

function main() {
  var background = chrome.extension.getBackgroundPage();
  var settings = background.settings;
  var communicator = background.communicator;

  var settingCheckboxes = document.querySelectorAll('#settings input');

  for (var i = 0, len = settingCheckboxes.length; i < len; i++) {
    var settingValue = settings.get(settingCheckboxes[i].id);
    if (typeof settingValue == 'boolean') {
      settingCheckboxes[i].checked = settingValue;
      settingCheckboxes[i].addEventListener('click', function() {
        settings.toggle(this.id);
        communicator.notify('refreshSettings', settings.getAll());
      });
    }
  }
}