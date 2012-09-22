(function() {
  var videoLinks, len, index = 0, videoPlayer,
      playerOffsetTop, settings;

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
      // don't jump to anchors, use scrollTo and absolute positions instead (looks cleaner, doesn't change url)
      jumpToVideoPlayer();

      var element = this;
      whenVideoPlayerIsAvailable(function() {
        replaceVideoPlayer(element);
      });
    }
  }

  function replaceVideoPlayer(element) {
    //// 1. replace the player with the new video
    var videoId = getQueryParam('v', element.href);

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

    //// 2. replace the video info. a bit scrappy, but what of it?

    // the video info of the current, so called, featured video
    var featuredInfo = document.querySelector('.channels-featured-video-details');

    // replace link
    var newLink = element.cloneNode(false);
    newLink.innerText = element.querySelector('.video-title').innerText;
    var oldLink = featuredInfo.querySelector('.title a');
    oldLink.parentNode.replaceChild(newLink, oldLink);

    // replace user name
    var userText = featuredInfo.querySelector('.channels-featured-video-metadata span');
    var userName = userText.innerText;
    userText.innerText = userName.substring(0, userName.lastIndexOf(' ') + 1 || userName.length) + element.querySelector('.yt-user-name').innerText;

    // replace created date
    featuredInfo.querySelector('.created-date').innerText = element.querySelector('.video-time-published').innerText;

    // replace view count
    featuredInfo.querySelector('.count').innerText = element.querySelector('.video-view-count').innerText.replace(/[^\d,.]+/, '');
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
    videoLinks = document.querySelectorAll('.gh-single-playlist .yt-uix-sessionlink');
    len = videoLinks.length;
    registerLinkEventListeners();

    communicator.request('allSettings', function(remoteSettings) {
      settings = remoteSettings;
      console.log('"Stay on channel" started', truth(!settings.extensionActive, '[inactive]'));
    });

    // load youtube iframe api which will automatically replace the old video player
    injectJavaScript('//www.youtube.com/iframe_api');

    // will set the videoPlayer for the first time
    whenVideoPlayerIsAvailable(function() {
      playerOffsetTop = (function() {
        var offsetTop = 0, current = videoPlayer;
        do {
          offsetTop += current.offsetTop;
        } while(current = current.offsetParent);

        // jump a bit above for the good feeling
        return offsetTop - 20;
      })();
    });

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