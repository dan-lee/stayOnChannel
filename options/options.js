$(function() {
  var background = chrome.extension.getBackgroundPage();
  var settings = background.settings;
  var communicator = background.communicator;

  $('#settings').find('input').each(function() {
    try {
      var settingValue = settings.get(this.id);

      switch(typeof settingValue) {
        case 'boolean':
          var cb = $(this);
          $(this).prop('checked', settingValue);
          $(this).on('click', function() {
            if (settings.toggle(this.id)) {
              communicator.notify('refreshSettings', settings.getAll());
              $('#success').clearQueue().fadeTo(750, 1).delay(1000).fadeTo(750, 0);
            } else {
              $('#success').stop().hide();
              $('#failure').clearQueue().fadeTo(500, 1).delay(1000).fadeTo(1000, 0);
            }
          });
          break;
        case 'string':
          //
          break;
        default:
          //
          break;
      }
    } catch(e) {
      console.log(e.message);
      $(this).hide();
    }

  });
});