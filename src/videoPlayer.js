var videoPlayer = {
  offsetTop: null,
  hasFeaturedPlayer: false,
  player: null,
  timeout: 15,
  timedOut: false,
  channelType: null,
  hasControl: false,
  maxConsecutiveErrors: 5,

  init: function(channelType) {
    this.channelType = channelType;
    this.injectVideoPlayer();

    this.onReady(function() {
      this.hasFeaturedPlayer && this.calculateOffset();
    });
  },

  injectVideoPlayer: function() {
    // load youtube iframe api which will automatically replace the old video player
    injectJavaScript(null, '//www.youtube.com/iframe_api');

    // this is transformed into a string and NOT executed here, but injected into the youtube page!
    var template = 'var StayOnChannel = (' + (function() {
      var
        player,
        playNext = [[playNext]],
        autoPlay = [[autoPlay]],
        autoQuality = '[[autoQuality]]',
        errors = 0;

      var nextEvent = document.createEvent('Event');
      nextEvent.initEvent('playNext', true, false);

      var prevEvent = document.createEvent('Event');
      prevEvent.initEvent('playPrev', true, false);

      return {
        // notify the content script
        playerStateChange: function(e) {
          if (e.data == YT.PlayerState.ENDED && playNext) {
            document.dispatchEvent(nextEvent);
          }
        },

        onReady: function(e) {
          autoPlay && e.target.playVideo();
          player.setPlaybackQuality(autoQuality);
        },

        onError: function(code) {
          if (++errors < [[maxErrors]]) {
            autoPlay && document.dispatchEvent(nextEvent);
          } else {
            alert('Autoplay aborted due too much consecutive unplayable videos.')
          }
          switch(code) {
            case 2:
              console.log('Malformed video id.');
              // invalid Id
              break;
            case 5:
              console.log('Cannot be played as HTML5.');
              // not allowed as html5
              break;
            case 100:
              console.log('Video has been removed.');
              // video removed
              break;
            case 101:
            case 150:
              console.log('Video is not allowed to be played embedded.');
              // not allowed to play embeded videos
              break;
          }
        },

        startVideo: function(elementId, videoId) {
          var self = this;
          player = new YT.Player(elementId, {
            videoId: videoId,
            events: {
              onReady: self.onReady,
              onError: self.onError,
              onStateChange: self.playerStateChange
            }
          });
          return player;
        },

        getPlayer: function() {
          return player;
        },

        playNext: function() {
          document.dispatchEvent(nextEvent);
        },

        playPrev: function() {
          document.dispatchEvent(prevEvent);
        }
      };
    }) + ')();';

    var inject = new Template();
    inject.setContent(template);
    inject.setVars({
      playNext: settings.playNext.toString(),
      autoPlay: settings.autoPlay.toString(),
      autoQuality: this.getSuggestedQuality(),
      maxErrors: this.maxConsecutiveErrors
    });
    injectJavaScript(inject.get());
  },

  injectControl: function() {
    if (!this.hasControl) {
      this.hasControl = true;
      return;
    }
    var code = '(' +function() {
      var control = document.createElement('div');
      control.id = 'stayOnChannel-control';
      control.innerHTML = '<ul><li id="soc-play-pause">Play/pause</li><li id="soc-next">Next</li><li id="soc-prev">Previous</li><li id="soc-jump">To top/last</li></ul>';
      document.body.appendChild(control);

      document.getElementById('soc-play-pause').addEventListener('click', function() {
        var p = StayOnChannel.getPlayer();
        p.getPlayerState() == YT.PlayerState.PAUSED || YT.PlayerState.STOPPED ? p.playVideo(): p.pauseVideo();
      });

      document.getElementById('soc-next').addEventListener('click', function() {
        StayOnChannel.playNext();
      });

      document.getElementById('soc-prev').addEventListener('click', function() {
        StayOnChannel.playPrev();
      });
    }+ ')();';
    injectJavaScript(code);
  },

  getSuggestedQuality: function() {
    var q = 'default';
    if (settings.enableAutoQuality) {
      switch(''+settings.autoQuality) {
        case '240':  q = 'small';   break;
        case '360':  q = 'medium';  break;
        case '480':  q = 'large';   break;
        case '720':  q = 'hd720';   break;
        case '1080': q = 'hd1080';  break;
        case 'max':  q = 'highres'; break;
        default:     q = 'default';
      }
    }

    return q;
  },

  startVideo: function(videoId) {
    if (!this.hasFeaturedPlayer || this.timedOut) {
      if (window.confirm('No "featured video" player found. Do you want "YouTube™ Stay On Channel" to create a video player in this window?')) {
        this.create(videoId);
      }
    } else {
      this.replaceVideo(videoId);
    }
  },

  create: function(videoId) {
    console.log('Creating player...');
    var self = this;

    var selector, customClass = '';

    switch(self.channelType) {
      case ChannelTypes.FEATURED:
        selector = '.playlist-info';
        customClass = 'soc_channel-module';
        break;
      case ChannelTypes.FEED:
        selector = '.yt-horizontal-rule.channel-section-hr';
        customClass = 'soc_channel-module-margin';
        break;
      case ChannelTypes.PLAYLIST:
        selector = '#playlist-actions';
        break;
    }
    var appendTo = document.querySelector(selector);

    var playerTemplate = new Template();
    playerTemplate.loadContent(chrome.extension.getURL('src/resources/player.html'), function() {
      playerTemplate.setVars({
        playerId: 'movie_player'
      });
      appendTo.outerHTML += playerTemplate.get();
      self.player = document.getElementById('movie_player');
      self.replaceVideo(videoId);
      self.calculateOffset();
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
      this.injectControl();

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

      var eval = 'StayOnChannel.startVideo("'+this.player.id+'", "'+videoId+'");';
      injectJavaScript(eval);
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