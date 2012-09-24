(function() {
  var videoLinks, linklistLength, index = 0, settings;

  var videoPlayer = {
    offsetTop: null,
    hasFeaturedPlayer: false,
    player: null,
    timeout: 15,
    timedOut: false,

    init: function() {
      // load youtube iframe api which will automatically replace the old video player
      injectJavaScript('//www.youtube.com/iframe_api');

      this.onReady(function() {
        this.hasFeaturedPlayer && this.calculateOffset();
      });
    },

    create: function(videoId) {
      console.log('Creating player...');

      getVideoInfo(videoId, function(info) {
        // append it after horizontal ruler in the feed
        document
          .querySelector('.yt-horizontal-rule.channel-section-hr')
          .outerHTML += playerTemplate.get(info);

        this.player = document.getElementById(playerTemplate.id);
        this.calculateOffset();
        this.replaceVideo(videoId);
      }.bind(this));
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
          this.player = videoPlayer;
          window.clearInterval(check);
          window.setTimeout(callback.call(this), 100);
        }
      }.bind(this), 100);
    },

    replaceVideo: function(videoId, jumpToPlayer) {
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

        // inject javascript code for instantiating the new player
        var javascriptCode = [
          'new YT.Player("',this.player.id,'", {',
          '  videoId: "',videoId,'",',
          '  events: {',
          truth(settings.autoPlay, 'onReady: function(e) { e.target.playVideo(); }'),
          '  }',
          '});'].join('');
        injectJavaScript(null, javascriptCode);

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

  // this may be called multiple times (after "Load more" button is clicked)
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
      var videoId = getQueryParam('v', this.href);

      if (!videoPlayer.hasFeaturedPlayer || videoPlayer.timedOut) {
        if (window.confirm('No "featured video" player found. Do you want "YouTube™ Stay On Channel" to create a video player in this window?')) {
          videoPlayer.create(videoId);
        }
      } else {
        videoPlayer.replaceVideo(videoId);
      }
    }
  }

  function redirectToVideo(e) {
    // http://javascriptweblog.wordpress.com/2011/04/04/the-javascript-comma-operator/
    settings.rightClickRedirect && (e.preventDefault(), window.location = this.href);
  }

  // keep an ear open for external setting updates
  communicator.on('refreshSettings', function(response) {
    settings = response;
  });

  function initialize() {
    if (!document.querySelector('#page.channel')) {
      // this is no channel; abort!
      return;
    }

    if (document.querySelector('.comment-post')) {
      // this is the comment feed; abort!
      return;
    }

    if (!getVideoLinks()) {
      // no video links on this channel; abort!
      // @todo playlist support
      return;
    }

    // request user settings from the background page
    communicator.request('allSettings', function(remoteSettings) {
      settings = remoteSettings;
      console.log('"YouTube Stay on channel" started', truth(!settings.extensionActive, '[inactive]'));

      settings.extendPlaylist && extendPlaylist();
    });

    videoPlayer.init();

    // if it's an featured channel, then attach an event listener to 'load more' button, so new videos will get an event listener too.
    registerLoadMoreButton();

    // and finally register event listeners to all found video links on the channel
    linklistLength = videoLinks.length;
    registerLinkEventListeners();
  }

  function getVideoLinks() {
    // select "Feed channels"
    var feeds = document.querySelectorAll('.primary-pane .yt-uix-contextlink.yt-uix-sessionlink:not(.yt-pl-thumb-link):not(.yt-user-name)');
    // select "Featured channels"
    var featured = document.querySelectorAll('.gh-single-playlist .yt-uix-sessionlink:not(.yt-user-name)');

    // if feeds are selected, assume that there is no featured player
    videoLinks = feeds.length ? (videoPlayer.hasFeaturedPlayer = false, feeds) : featured;

    return !!videoLinks.length;
  }

  function registerLoadMoreButton() {
    var loadMoreButton = document.querySelector('button.more-videos, button.load-more-button');
    loadMoreButton && loadMoreButton.addEventListener('click', function() {
      var checkLinkInterval = window.setInterval(function() {
        videoLinks = document.querySelectorAll('.gh-single-playlist .yt-uix-sessionlink');
        if ((linklistLength = videoLinks.length) > index) {
          window.clearInterval(checkLinkInterval);
          registerLinkEventListeners();
        }
      }, 150);
    });
    return !!loadMoreButton;
  }

  function extendPlaylist() {
    // playlist manipulation
    var favoriteVideos = document.querySelector('.playlist-info h2');

    if (favoriteVideos) {
      var zoomIn = document.createElement('img');
      zoomIn.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABx0RVh0U29mdHdhcmUAQWRvYmUgRmlyZXdvcmtzIENTM5jWRgMAAAAVdEVYdENyZWF0aW9uIFRpbWUAMi8xNy8wOCCcqlgAAAQRdEVYdFhNTDpjb20uYWRvYmUueG1wADw/eHBhY2tldCBiZWdpbj0iICAgIiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+Cjx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDQuMS1jMDM0IDQ2LjI3Mjk3NiwgU2F0IEphbiAyNyAyMDA3IDIyOjExOjQxICAgICAgICAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp4YXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iPgogICAgICAgICA8eGFwOkNyZWF0b3JUb29sPkFkb2JlIEZpcmV3b3JrcyBDUzM8L3hhcDpDcmVhdG9yVG9vbD4KICAgICAgICAgPHhhcDpDcmVhdGVEYXRlPjIwMDgtMDItMTdUMDI6MzY6NDVaPC94YXA6Q3JlYXRlRGF0ZT4KICAgICAgICAgPHhhcDpNb2RpZnlEYXRlPjIwMDgtMDMtMjRUMTk6MDA6NDJaPC94YXA6TW9kaWZ5RGF0ZT4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICAgICAgICAgIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyI+CiAgICAgICAgIDxkYzpmb3JtYXQ+aW1hZ2UvcG5nPC9kYzpmb3JtYXQ+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDUdUmQAAAILSURBVDiNpZNBaxpBGIafiQYjLnT1IEoOayDk4qV4yKF4iYIXhYKCPSZiWHLNT/EYSxsvpTLgtZ41Glgv6Q/oZW2EooQsCmtYYqeHaGgToaV54TsMw/vMN+98I5RSvER+ACEEAK1WyxiPxw3bttOO4/iDwaCKx+M/EolEuVwu91am3w8VSimEEDSbzXeWZX02DEPkcjni8Ti3t7f0+30GgwGpVOpDpVI5fgpAKUWr1TJOT09/SinV3d3ds+r1eurk5ERJKdMrz6o2AMbjcWNnZ0fk83kAPM+jUCjgui6e55FKpdjb22M0Gn18msEGgG3b6Ww2i8/nw/M8XNcFYDab4boui8WCTCaDbdu7a0N0HMcfi8UAKBaLj5vVahUAKSWapjGfz8VawNbWlppMJiIUCiGlZDabUa1WqdVqaJoGwPX1Nbqu36+9gmEY3yzLeiD6/QQCAQA0TSMQCLBYLOh2uyQSiYu1HWxvbx91Op1+OBwml8shhEBKCcDm5ibtdpvJZKKm0+kneJib1VM+zsH5+fn7wWBwnEwm2d/fJxKJMBwOuby85ObmRvl8vi/T6TQPNOr1euUZYBnWm9Fo1BgOh7vz+Vzoun5vGMZFNBo9LJVK303TvAJeA1+Bg7OzM+cPwN9kmqaxNOuAAxxs/JNzqXq9bgNHy6UOvOJ/fqNpmoemab5VSj1k8BL9Ag1TBiSIP+FpAAAAAElFTkSuQmCC';
      zoomIn.classList.add('soc_zoom');
      favoriteVideos.appendChild(zoomIn);

      var zoomOut = document.createElement('img');
      zoomOut.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABx0RVh0U29mdHdhcmUAQWRvYmUgRmlyZXdvcmtzIENTM5jWRgMAAAAVdEVYdENyZWF0aW9uIFRpbWUAMi8xNy8wOCCcqlgAAAQRdEVYdFhNTDpjb20uYWRvYmUueG1wADw/eHBhY2tldCBiZWdpbj0iICAgIiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+Cjx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDQuMS1jMDM0IDQ2LjI3Mjk3NiwgU2F0IEphbiAyNyAyMDA3IDIyOjExOjQxICAgICAgICAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp4YXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iPgogICAgICAgICA8eGFwOkNyZWF0b3JUb29sPkFkb2JlIEZpcmV3b3JrcyBDUzM8L3hhcDpDcmVhdG9yVG9vbD4KICAgICAgICAgPHhhcDpDcmVhdGVEYXRlPjIwMDgtMDItMTdUMDI6MzY6NDVaPC94YXA6Q3JlYXRlRGF0ZT4KICAgICAgICAgPHhhcDpNb2RpZnlEYXRlPjIwMDgtMDMtMjRUMTk6MDA6NDJaPC94YXA6TW9kaWZ5RGF0ZT4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICAgICAgICAgIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyI+CiAgICAgICAgIDxkYzpmb3JtYXQ+aW1hZ2UvcG5nPC9kYzpmb3JtYXQ+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDUdUmQAAAIISURBVDiNpZO9a1pRGMZ/Jxo/yIXeZBDF4SqELC7FIUNxSQQXh4KCHRMhXFz9c7S0upSGC6511qhwXdo/oMu1CkUJXvy4hkvs6RAtbSK0NA+8wxme3/ue57xHSCl5jrwAQggAGo2GNh6P65ZlpWzb9gaDQRmJRL7HYrFCoVDobE2/NxVSSoQQXF9fvzFN86OmaSKTyRCJRJhOp3S7Xfr9Pslk8l2xWLx6DEBKSaPR0Mrl8g/DMOTd3d2T6nQ6slQqScMwUlvPtvYAxuNxPR6Pi2w2C4DruiyXSxzHwXVdkskkJycnjEaj948z2AOwLCuVTqfxeDy4rovjOCwWC+bzOY7jsF6vOT8/x7Ks450h2rbtDYfDAORyuSdJG4aBoiisViuxExAIBORkMhEHBwcYhsF8PmexWACgKAoAw+EQVVXvd15B07Svpmk+EL1e/H4/iqKgKAp+v5/1ek273SYWi93snCAajV62Wq3u4eEhmUwGIQQ+nw+A/f19ms0mk8lEzmazD/CwN9un/LUHtVrtbb/fv0okEpyennJ0dMRgMKDX63F7eys9Hs+n2WyWBerVarX4BLAJ69VoNKoPBoPj1WolVFW91zTtJhQKXeTz+W+6rn8GXgJfgLNKpWL/AfibdF3XNmYVsIGzvX9yblStVi3gcnNUgRf8z2/Udf1C1/XXUsqHDJ6jn9maCAp43gnmAAAAAElFTkSuQmCC';
      zoomOut.classList.add('soc_zoom');
      zoomOut.classList.add('disabled');
      favoriteVideos.appendChild(zoomOut);
    }
  }

  initialize();
})();