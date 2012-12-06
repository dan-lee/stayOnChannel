$(function() {
  var background = chrome.extension.getBackgroundPage();
  var settings = background.settings;
  var communicator = background.communicator;

  function success() {
    $('#success').clearQueue().fadeTo(750, 1).delay(1000).fadeTo(750, 0);
  }

  function fail() {
    $('#success').stop().hide();
    $('#failure').clearQueue().fadeTo(500, 1).delay(1000).fadeTo(1000, 0);
  }

  $('#settings').find('input, select').each(function() {
    try {
      var settingValue = settings.get(this.id);

      switch(this.id) {
        case 'autoQuality':
          if (this.id == 'autoQuality') {
            var select = $(this);

            select.find('option').each(function() {
              if ($(this).val().slice(0, -1) == settingValue) {
                $(this).prop('selected', true);
              }
            });

            select.on('change', function() {
              var q = $(this).val().slice(0, -1);
              if (settings.set(this.id, q)) {
                success();
              } else {
                fail();
              }
            });
          }
          break;
        default:
          var cb = $(this);
          $(this).prop('checked', settingValue);
          $(this).on('click', function() {
            if (settings.toggle(this.id)) {
              success();
            } else {
              fail();
            }
          });
      }
    } catch(e) {
      console.log(e.message);
      $(this).hide();
    }

  });
});