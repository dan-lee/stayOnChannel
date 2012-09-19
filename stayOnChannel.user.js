(function(window, undefined) {
  var
    document = window.document,
    videoLinks = document.querySelectorAll('.gh-single-playlist .yt-uix-sessionlink'),
    loadMoreButton = document.querySelector('button.more-videos'),
    len = videoLinks.length,
    index = 0,
    videoPlayer,
    playerOffsetTop,
    settings;

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
            callback(request.message);
            sendResponse && sendResponse(request.message);
          }
        });
      }
    }
  })();

  function registerLinkEventListeners() {
    for(;index < len; index++) {
      addListeners(videoLinks[index]);
    }
  }

  function addListeners(element) {
    element.addEventListener('click', replaceVideoContainer);

    // double clicks will redirect to the video page
    element.addEventListener('contextmenu', redirectToVideo);
  }

  function replaceVideoContainer(e) {
    if (settings.extensionActive) {
      e.preventDefault();
      var href = this.href;
      // don't jump hashes to the anchor, but use scrollTo
      jumpToVideoPlayer();

      whenVideoPlayerIsAvailable(function() {
        replaceVideoPlayer(href);
      });
    }
  }

  function replaceVideoPlayer(url) {
    var videoId = getParameterByName('v', parseUrl(url));

    var tempDiv = document.createElement('div');
    tempDiv.id = videoPlayer.id;
    tempDiv.className = videoPlayer.className;
    videoPlayer.parentNode.replaceChild(tempDiv, videoPlayer);

    var javascriptCode = [
      'new YT.Player("'+videoPlayer.id+'", {',
      '  videoId: "'+videoId+'",',
      '  events: {',
      (settings.autoPlay ? 'onReady: function(e) { e.target.playVideo(); }' : ''),
      '  }',
      '});'].join('');

    injectJavaScript(null, javascriptCode);
  }

  function redirectToVideo(e) {
    settings.rightClickRedirect && e.preventDefault() && (window.location = this.href);
  }

  function jumpToVideoPlayer() {
    // only calculate once, the player will stay at the same position
    if (!playerOffsetTop) {
      var offsetTop = 0, current = videoPlayer;
      do {
        offsetTop += current.offsetTop;
      } while(current = current.offsetParent);
      // jump a bit above for the good feeling
      playerOffsetTop = offsetTop - 20;
    }
    settings.jumpToPlayer && window.scrollTo(0, playerOffsetTop);
  }

  function getParameterByName(name, location) {
    var match = new RegExp('[?&]' + name + '=([^&]*)').exec(location);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
  }

  function parseUrl(urlString) {
    var a = document.createElement('a');
    a.href = urlString;
    return a;
  }

  function injectJavaScript(src, textContent) {
    var scriptElement = document.createElement('script');
    if (!!src) {
      scriptElement.src = src;
    } else if (!!textContent) {
      scriptElement.textContent = textContent;
    }
    var target = document.getElementsByTagName('head')[0] || document.body || document.documentElement;
    target.appendChild(scriptElement);
  }

  communicator.on('refreshSettings', function(response) {
    console.log('refreshed settings', response);
    settings = response;
  });

  function initialize() {
    registerLinkEventListeners();

    // <chrome>
    communicator.request('allSettings', function(remoteSettings) {
      settings = remoteSettings;
    });
    // </chrome>

    // load youtube iframe api which will automatically replace the old video player
    injectJavaScript('//www.youtube.com/iframe_api');
    // will set the videoPlayer for the first time
    whenVideoPlayerIsAvailable();

    // append event listeners when more videos are loaded
    loadMoreButton.addEventListener('click', function() {
      var checkLinkInterval = window.setInterval(function() {
        videoLinks = document.querySelectorAll('.gh-single-playlist .yt-uix-sessionlink');
        if ((len = videoLinks.length) > index) {
          window.clearInterval(checkLinkInterval);
          registerLinkEventListeners();
        }
      }, 150);
    });
  }

  function whenVideoPlayerIsAvailable(cb) {
    var check = window.setInterval(function() {
      videoPlayer = document.querySelector('#movie_player-flash, #movie_player, #movie_player-html5');

      if (videoPlayer) {
        window.clearInterval(check);
        // it's not 100% initialized when found, so give some extra time
        window.setTimeout(cb, 100);
      }
    }, 150);
  }
  initialize();
})(window, undefined);