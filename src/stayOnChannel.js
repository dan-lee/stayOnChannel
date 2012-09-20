(function() {
  var videoLinks, videoPlayer,
      len, index = 0, settings,
      playerOffsetTop;

  // may be called multiple times (after "Load more" button is clicked)
  function registerLinkEventListeners() {
    for(;index < len; index++) {
      addListeners(videoLinks[index]);
    }
  }

  function addListeners(element) {
    element.addEventListener('click', replaceVideoContainer);

    // right click will redirect to the video page
    element.addEventListener('contextmenu', redirectToVideo);
  }

  function replaceVideoContainer(e) {
    if (settings.extensionActive) {
      e.preventDefault();
      var href = this.href;
      // don't jump to anchors, use scrollTo and absolute positions instead (looks cleaner, doesn't change url)
      jumpToVideoPlayer();

      whenVideoPlayerIsAvailable(function() {
        replaceVideoPlayer(href);
      });
    }
  }

  function replaceVideoPlayer(url) {
    var videoId = getQueryParam('v', url);

    var tempDiv = document.createElement('div');
    tempDiv.id = videoPlayer.id;
    videoPlayer.parentNode.replaceChild(tempDiv, videoPlayer);

    var javascriptCode = [
      'new YT.Player("',videoPlayer.id,'", {',
      '  videoId: "',videoId,'",',
      '  events: {',
      truth(settings.autoPlay, 'onReady: function(e) { e.target.playVideo(); }'),
      '  }',
      '});'].join('');

    injectJavaScript(null, javascriptCode);
  }

  function redirectToVideo(e) {
    // Yay! Found a place where I can actually implement this
    // http://javascriptweblog.wordpress.com/2011/04/04/the-javascript-comma-operator/
    settings.rightClickRedirect && (e.preventDefault(), window.location = this.href);
  }

  function jumpToVideoPlayer() {
    settings.jumpToPlayer && window.scrollTo(0, playerOffsetTop);
  }

  communicator.on('refreshSettings', function(response) {
    console.log('refreshed settings', response);
    settings = response;
  });

  function initialize() {
    registerLinkEventListeners();

    communicator.request('allSettings', function(remoteSettings) {
      settings = remoteSettings;
    });

    // load youtube iframe api which will automatically replace the old video player
    injectJavaScript('//www.youtube.com/iframe_api');
    // will set the videoPlayer for the first time
    whenVideoPlayerIsAvailable(function() {
      console.log('"Stay on channel" started', truth(settings.extensionActive, '[inactive]'));
    });

    playerOffsetTop = (function() {
      var offsetTop = 0, current = videoPlayer;
      do {
        offsetTop += current.offsetTop;
      } while(current = current.offsetParent);

      // jump a bit above for the good feeling
      return offsetTop - 20;
    })();

    // append event listeners when more videos are loaded
    document.querySelector('button.more-videos').addEventListener('click', function() {
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
})();