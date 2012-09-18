// ==UserScript==
// @name           YouTube Stay On Channel
// @namespace      Agixo
// @version        1.0
// @author         Dan Lee <daniellehr@gmx.de>
// @description    If you are on a user channel you can click on a video in the list and the site won't change its location; instead it will reload into the current movie player on the top. Works with Flash and HTML5
// @include        *youtube.com/user/*
// @run-at         document-end
// ==/UserScript==

// @<chrome>
var port = chrome.extension.connect();

port.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('onMessage', sendResponse.settingsUpdate);
});

// @</chrome>

(function(window, undefined) {
  var
    document = window.document,
    videoLinks = document.querySelectorAll('.gh-single-playlist .yt-uix-sessionlink'),
    len = videoLinks.length,
    index = 0,
    videoPlayer,
    playerOffsetTop,
    settings,
    loadMoreButton = document.querySelector('button.more-videos');

  initialize();

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

    var javascriptCode =
      'new YT.Player("'+videoPlayer.id+'", {' +
      '  videoId: "'+videoId+'",' +
      '  events: {' +
      (settings.autoPlay ? 'onReady: function(e) { e.target.playVideo(); }' : '') +
      '  }' +
      '});';

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

  function getSettings() {
    chrome.extension.sendMessage({ getAllSettings: true }, function(response) {
      settings = response.value;
    });
  }


  function initialize() {
    registerLinkEventListeners();

    getSettings();

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
})(window, undefined);