var videoPlayer = {
  offsetTop: null,
  hasFeaturedPlayer: false,
  player: null,
  timeout: 15,
  timedOut: false,

  init: function() {
    // load youtube iframe api which will automatically replace the old video player
    injectJavaScript(null, '//www.youtube.com/iframe_api');

    this.onReady(function() {
      var eval = 'var StayOnChannel = (' + (function() {

        var playNext = $(playNext),
            autoPlay = $(autoPlay);

        var evt = document.createEvent('Event');
        evt.initEvent('playNext', true, false);

        return {
          // notify the content script
          playerStateChange: function(e) {
            if (e.data == YT.PlayerState.ENDED && playNext) {
              document.dispatchEvent(evt);
            }
          },

          onReady: function(e) {
            autoPlay && e.target.playVideo();
          },

          startVideo: function(videoId) {
            var self = this;
            return new YT.Player('$(playerId)', {
              videoId: videoId,
              events: {
                onReady: this.onReady,
                onStateChange: this.playerStateChange
              }
            });
          }
        };
      }) + ')();';

      var inject = new Template();
      inject.setContent(eval);
      inject.setVars({
        playerId: videoPlayer.player.id,
        playNext: settings.playNext.toString(),
        autoPlay: settings.autoPlay.toString()
      });

      injectJavaScript(inject.get());

      this.hasFeaturedPlayer && this.calculateOffset();
    });
  },

  create: function(videoId, next) {
    console.log('Creating player...');
    var self = this;

    getVideoInfo(videoId, function(info) {
      // append it after horizontal ruler in the feed
      var appendTo = document.querySelector('.yt-horizontal-rule.channel-section-hr, .playlist-info');

      // if this is an featured channel, then don't apply extra margin
      var extraMargin = appendTo.classList.contains('playlist-info') ? 'soc_channel-module' : 'soc_channel-module-margin';

      info.playerId = 'movie_player';
      info.customClass = extraMargin;

      var playerTemplate = new Template();
      playerTemplate.loadContent(chrome.extension.getURL('src/resources/player.html'), function() {
        this.setVars(info);
        appendTo.outerHTML += playerTemplate.get();
        self.player = document.getElementById(info.playerId);
        self.calculateOffset();
        self.replaceVideo(videoId, next);
      });
    });
  },

  onReady: function(callback) {
    var i = 0;
    var check = window.setInterval(function() {
      var videoPlayer = document.querySelector('#movie_player, #movie_player-flash, #movie_player-html5');

      // search for video player timed out, an own player needs to be created
      if (++i > this.timeout) {
        this.timedOut = true;
        this.hasFeaturedPlayer = false;
        window.clearInterval(check);
        console.log('No featured player found.');
      }

      if (videoPlayer) {
        this.timedOut = false;
        this.hasFeaturedPlayer = true;
        videoPlayer.id = 'movie_player';
        this.player = videoPlayer;
        window.clearInterval(check);
        window.setTimeout(callback.call(this), 100);
      }
    }.bind(this), 100);
  },

  replaceVideo: function(videoId) {
    this.onReady(function() {
      var tempDiv = document.createElement('div');
      tempDiv.id = this.player.id;
      this.player.parentNode.replaceChild(tempDiv, this.player);

      // replace meta data of the video
      var base = document.querySelector('.channels-featured-video-details');

      getVideoInfo(videoId, function(info) {
        // replace link, title and view count
        base
          .querySelector('.channels-featured-video-details h3')
          .innerHTML =  '<a href="/watch?v='+videoId+'">'+info.title+'</a><div class="view-count-and-actions"><div class="view-count"><span class="count">'+info.views+'</span> views</div></div>';

        // replace creator and create date
        base
          .querySelector('.channels-featured-video-metadata')
          .innerHTML = '<span>'+info.creator+'</span> <span class="created-date">'+info.created+'</span>';
      });

      var eval = 'StayOnChannel.startVideo("'+videoId+'");';
      injectJavaScript(eval);

      // don't jump to anchors, use scrollTo and absolute positions instead (looks cleaner, doesn't change url)
      settings.jumpToPlayer && this.jumpTo();
    });
  },

  calculateOffset: function() {
    var self = this;
    this.offsetTop = (function() {
      var offsetTop = 0, current = self.player;
      do {
        offsetTop += current.offsetTop;
      } while(current = current.offsetParent);

      // jump a bit above for the good feeling
      return offsetTop - 20;
    })();
  },

  jumpTo: function() {
    window.scrollTo(0, this.offsetTop);
  }
};