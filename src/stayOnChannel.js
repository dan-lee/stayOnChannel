(function() {
  var videoLinks, linklistLength, index = 0, settings;

  var videoPlayer = {
    offsetTop: null,
    player: null,
    init: function() {
      var self = this;
      this.onReady(function(videoPlayer) {
        self.offsetTop = (function() {
          var offsetTop = 0, current = videoPlayer;
          do {
            offsetTop += current.offsetTop;
          } while(current = current.offsetParent);

          // jump a bit above for the good feeling
          return offsetTop - 20;
        })();
      });
    },

    onReady: function(callback) {
      var check = window.setInterval(function() {
        var videoPlayer = document.querySelector('#movie_player-flash, #movie_player, #movie_player-html5');

        if (videoPlayer) {
          this.player = videoPlayer;
          window.clearInterval(check);
          window.setTimeout(callback(videoPlayer), 100);
        }
      }, 150);
    },
    jumpTo: function() {
      window.scrollTo(0, this.offsetTop);
    },
    replaceVideo: function(videoId) {
      this.onReady(function() {
        var tempDiv = document.createElement('div');
        tempDiv.id = this.player.id;
        this.player.parentNode.replaceChild(tempDiv, this.player);

        var javascriptCode = [
          'new YT.Player("',this.player.id,'", {',
          '  videoId: "',videoId,'",',
          '  events: {',
          truth(settings.autoPlay, 'onReady: function(e) { e.target.playVideo(); }'),
          '  }',
          '});'].join('');
        injectJavaScript(null, javascriptCode);
      });
    }
  };

  // may be called multiple times (after "Load more" button is clicked)
  function registerLinkEventListeners() {
    for(;index < linklistLength; index++) {
      var element = videoLinks[index];
      element.addEventListener('click', replaceVideoContainer);

      // right click will redirect to the video page
      element.addEventListener('contextmenu', redirectToVideo);
    }
  }

  function replaceVideoContainer(e) {
    if (settings.extensionActive) {
      e.preventDefault();
      // don't jump to anchors, use scrollTo and absolute positions instead (looks cleaner, doesn't change url)
      settings.jumpToPlayer && videoPlayer.jumpTo();
      videoPlayer.replaceVideo(getQueryParam('v', this.href));

      // the video info of the current, so called, featured video
      var featuredInfo = document.querySelector('.channels-featured-video-details');

      // replace link
      var newLink = this.cloneNode(false);
      newLink.innerText = this.querySelector('.video-title').innerText;
      var oldLink = featuredInfo.querySelector('.title a');
      oldLink.parentNode.replaceChild(newLink, oldLink);

      // replace user name
      var userText = featuredInfo.querySelector('.channels-featured-video-metadata span');
      var userName = userText.innerText;
      userText.innerText = userName.substring(0, userName.lastIndexOf(' ') + 1 || userName.length) + this.querySelector('.yt-user-name').innerText;

      // replace created date
      featuredInfo.querySelector('.created-date').innerText = this.querySelector('.video-time-published').innerText;

      // replace view count
      featuredInfo.querySelector('.count').innerText = this.querySelector('.video-view-count').innerText.replace(/[^\d,.]+/, '');
    }
  }

  function redirectToVideo(e) {
    // Yay! Found a place where I can actually implement this
    // http://javascriptweblog.wordpress.com/2011/04/04/the-javascript-comma-operator/
    settings.rightClickRedirect && (e.preventDefault(), window.location = this.href);
  }

  communicator.on('refreshSettings', function(response) {
    settings = response;
  });

  function initialize() {
    // register
    videoLinks = document.querySelectorAll('.gh-single-playlist .yt-uix-sessionlink');
    linklistLength = videoLinks.length;
    registerLinkEventListeners();

    // request user settings from the background page
    communicator.request('allSettings', function(remoteSettings) {
      settings = remoteSettings;
      console.log('"YouTube Stay on channel" started', truth(!settings.extensionActive, '[inactive]'));
    });

    // load youtube iframe api which will automatically replace the old video player
    injectJavaScript('//www.youtube.com/iframe_api');

    videoPlayer.init();

    // append event listeners when more videos are loaded
    document.querySelector('button.more-videos').addEventListener('click', function() {
      var checkLinkInterval = window.setInterval(function() {
        videoLinks = document.querySelectorAll('.gh-single-playlist .yt-uix-sessionlink');
        if ((linklistLength = videoLinks.length) > index) {
          window.clearInterval(checkLinkInterval);
          registerLinkEventListeners();
        }
      }, 150);
    });
  }

  initialize();
})();