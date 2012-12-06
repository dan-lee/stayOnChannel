(function() {
  var
    videoLinks,
    linklistLength,
    index = 0,
    activeSelector,
    activeVideoIndex = 0,
    loadMoreButton,
    playNext,
    channelType;

  // keep an ear open for external setting updates
  communicator.on('refreshSettings', function(response) {
    settings = response;
  });

  function initialize() {
    if (!(document.querySelector('#page.channel') || document.querySelector('#page.playlist')) || document.querySelector('.comment-post')) {
      // this is no channel/playlist; abort!
      return;
    }

    if (!collectVideoLinks()) {
      // no video links on this channel; abort!
      return;
    }

    // request user settings from the background page
    communicator.request('allSettings', function(remoteSettings) {
      settings = remoteSettings;
      console.log('"YouTube Stay on channel" started', truth(!settings.extensionActive, '[inactive]'));
      videoPlayer.init(channelType);
      //settings.extendPlaylist && extendPlaylist();
    });

    // if it's an featured channel, then attach an event listener to 'load more' button, so new videos will get an event listener too.
    registerLoadMoreButton();

    // and finally register event listeners to all found video links on the channel
    linklistLength = videoLinks.length;
    registerLinkEventListeners();
  }

  document.addEventListener('playNext', playNextVideo);

  function playNextVideo() {
    if (settings.autoPlay) {
      var next = getNextVideo();
      if (next) {
        activeVideoIndex = next.indexId;
        videoPlayer.replaceVideo(next.videoId);
        settings.autoPlayJumpToPlayer && videoPlayer.jumpTo();
      } else {
        if (registerLoadMoreButton()) {
          var evt = document.createEvent('MouseEvents');
          evt.initEvent('click', true, true);
          loadMoreButton.dispatchEvent(evt);
          playNext = true;
        } else {
          console.log('End of channel playlist reached.');
        }
      }
    }
  }

  function getNextVideo() {
    var next, checkIndex = activeVideoIndex, current = getQueryParam('v', videoLinks[activeVideoIndex]);

    do {
      next = getQueryParam('v', videoLinks[++checkIndex]);
    } while(next == current && checkIndex <= linklistLength);

    if (next == current || checkIndex == linklistLength) {
      return false;
    }
    activeVideoIndex = checkIndex;
    return { videoId: next, indexId: checkIndex };
  }

  // this may be called multiple times (after "Load more" button is clicked)
  function registerLinkEventListeners() {
    for(;index < linklistLength; index++) {
      var element = videoLinks[index];
      (function(index) {
        element.addEventListener('click', function() {
          activeVideoIndex = index;
        });
      })(index);
      element.addEventListener('click', replaceVideoContainer);

      // right click will redirect to the video page
      element.addEventListener('contextmenu', redirectToVideo);
    }
  }

  function replaceVideoContainer(e) {
    if (settings.extensionActive) {
      e.preventDefault();
      var videoId = getQueryParam('v', this.href);
      videoPlayer.startVideo(videoId);

      // don't jump to anchors, use scrollTo and absolute positions instead (looks cleaner, doesn't change url)
      settings.jumpToPlayer && videoPlayer.jumpTo();
    }
  }

  function redirectToVideo(e) {
    // http://javascriptweblog.wordpress.com/2011/04/04/the-javascript-comma-operator/
    settings.rightClickRedirect && (e.preventDefault(), window.location = this.href);
  }

  function collectVideoLinks() {
    var feedSelector = '.primary-pane .yt-uix-contextlink.yt-uix-sessionlink:not(.yt-pl-thumb-link):not(.yt-user-name)';
    var featuredSelector = '.gh-single-playlist .yt-uix-sessionlink:not(.yt-user-name)';
    var playlistSelector = '.primary-pane .yt-uix-sessionlink:not(.yt-pl-thumb-link):not(.yt-user-name)';

    if ((videoLinks = document.querySelectorAll(feedSelector)) && videoLinks.length) {
      activeSelector = feedSelector;
      channelType = ChannelTypes.FEED;
    } else if ((videoLinks = document.querySelectorAll(featuredSelector)) && videoLinks.length) {
      activeSelector = featuredSelector;
      channelType = ChannelTypes.FEATURED;
    } else if ((videoLinks = document.querySelectorAll(playlistSelector)) && videoLinks.length) {
      activeSelector = playlistSelector;
      channelType = ChannelTypes.PLAYLIST;
    }
    return !!videoLinks.length;
  }

  function registerLoadMoreButton() {
    loadMoreButton = document.querySelector('button.more-videos, button.load-more-button');

    if (loadMoreButton) {
      loadMoreButton.addEventListener('click', function() {
        console.log('click');
        waitForLinks(function() {
          registerLinkEventListeners();
          registerLoadMoreButton();
          playNext && playNextVideo() && (playNext = false);
        });
      });
    }
    return !!loadMoreButton;
  }

  function waitForLinks(callback) {
    var intervalId = window.setInterval(function() {
      videoLinks = document.querySelectorAll(activeSelector);

      if ((linklistLength = videoLinks.length) > index) {
        window.clearInterval(intervalId);
        callback();
      }
    }, 250);
  }

  function extendPlaylist() {
    // playlist manipulation
    var favoriteVideos = document.querySelector('.playlist-info h2');

    if (favoriteVideos) {
      var zoomIn = document.createElement('img');
      zoomIn.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABx0RVh0U29mdHdhcmUAQWRvYmUgRmlyZXdvcmtzIENTM5jWRgMAAAAVdEVYdENyZWF0aW9uIFRpbWUAMi8xNy8wOCCcqlgAAAQRdEVYdFhNTDpjb20uYWRvYmUueG1wADw/eHBhY2tldCBiZWdpbj0iICAgIiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+Cjx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDQuMS1jMDM0IDQ2LjI3Mjk3NiwgU2F0IEphbiAyNyAyMDA3IDIyOjExOjQxICAgICAgICAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp4YXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iPgogICAgICAgICA8eGFwOkNyZWF0b3JUb29sPkFkb2JlIEZpcmV3b3JrcyBDUzM8L3hhcDpDcmVhdG9yVG9vbD4KICAgICAgICAgPHhhcDpDcmVhdGVEYXRlPjIwMDgtMDItMTdUMDI6MzY6NDVaPC94YXA6Q3JlYXRlRGF0ZT4KICAgICAgICAgPHhhcDpNb2RpZnlEYXRlPjIwMDgtMDMtMjRUMTk6MDA6NDJaPC94YXA6TW9kaWZ5RGF0ZT4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICAgICAgICAgIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyI+CiAgICAgICAgIDxkYzpmb3JtYXQ+aW1hZ2UvcG5nPC9kYzpmb3JtYXQ+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDUdUmQAAAILSURBVDiNpZNBaxpBGIafiQYjLnT1IEoOayDk4qV4yKF4iYIXhYKCPSZiWHLNT/EYSxsvpTLgtZ41Glgv6Q/oZW2EooQsCmtYYqeHaGgToaV54TsMw/vMN+98I5RSvER+ACEEAK1WyxiPxw3bttOO4/iDwaCKx+M/EolEuVwu91am3w8VSimEEDSbzXeWZX02DEPkcjni8Ti3t7f0+30GgwGpVOpDpVI5fgpAKUWr1TJOT09/SinV3d3ds+r1eurk5ERJKdMrz6o2AMbjcWNnZ0fk83kAPM+jUCjgui6e55FKpdjb22M0Gn18msEGgG3b6Ww2i8/nw/M8XNcFYDab4boui8WCTCaDbdu7a0N0HMcfi8UAKBaLj5vVahUAKSWapjGfz8VawNbWlppMJiIUCiGlZDabUa1WqdVqaJoGwPX1Nbqu36+9gmEY3yzLeiD6/QQCAQA0TSMQCLBYLOh2uyQSiYu1HWxvbx91Op1+OBwml8shhEBKCcDm5ibtdpvJZKKm0+kneJib1VM+zsH5+fn7wWBwnEwm2d/fJxKJMBwOuby85ObmRvl8vi/T6TQPNOr1euUZYBnWm9Fo1BgOh7vz+Vzoun5vGMZFNBo9LJVK303TvAJeA1+Bg7OzM+cPwN9kmqaxNOuAAxxs/JNzqXq9bgNHy6UOvOJ/fqNpmoemab5VSj1k8BL9Ag1TBiSIP+FpAAAAAElFTkSuQmCC';
      zoomIn.classList.add('soc_zoom');
      zoomIn.classList.add('disabled');
      zoomIn.addEventListener('click', function(e) {});
      favoriteVideos.appendChild(zoomIn);

      var zoomOut = document.createElement('img');
      zoomOut.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABx0RVh0U29mdHdhcmUAQWRvYmUgRmlyZXdvcmtzIENTM5jWRgMAAAAVdEVYdENyZWF0aW9uIFRpbWUAMi8xNy8wOCCcqlgAAAQRdEVYdFhNTDpjb20uYWRvYmUueG1wADw/eHBhY2tldCBiZWdpbj0iICAgIiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+Cjx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDQuMS1jMDM0IDQ2LjI3Mjk3NiwgU2F0IEphbiAyNyAyMDA3IDIyOjExOjQxICAgICAgICAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp4YXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iPgogICAgICAgICA8eGFwOkNyZWF0b3JUb29sPkFkb2JlIEZpcmV3b3JrcyBDUzM8L3hhcDpDcmVhdG9yVG9vbD4KICAgICAgICAgPHhhcDpDcmVhdGVEYXRlPjIwMDgtMDItMTdUMDI6MzY6NDVaPC94YXA6Q3JlYXRlRGF0ZT4KICAgICAgICAgPHhhcDpNb2RpZnlEYXRlPjIwMDgtMDMtMjRUMTk6MDA6NDJaPC94YXA6TW9kaWZ5RGF0ZT4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICAgICAgICAgIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyI+CiAgICAgICAgIDxkYzpmb3JtYXQ+aW1hZ2UvcG5nPC9kYzpmb3JtYXQ+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDUdUmQAAAIISURBVDiNpZO9a1pRGMZ/Jxo/yIXeZBDF4SqELC7FIUNxSQQXh4KCHRMhXFz9c7S0upSGC6511qhwXdo/oMu1CkUJXvy4hkvs6RAtbSK0NA+8wxme3/ue57xHSCl5jrwAQggAGo2GNh6P65ZlpWzb9gaDQRmJRL7HYrFCoVDobE2/NxVSSoQQXF9fvzFN86OmaSKTyRCJRJhOp3S7Xfr9Pslk8l2xWLx6DEBKSaPR0Mrl8g/DMOTd3d2T6nQ6slQqScMwUlvPtvYAxuNxPR6Pi2w2C4DruiyXSxzHwXVdkskkJycnjEaj948z2AOwLCuVTqfxeDy4rovjOCwWC+bzOY7jsF6vOT8/x7Ks450h2rbtDYfDAORyuSdJG4aBoiisViuxExAIBORkMhEHBwcYhsF8PmexWACgKAoAw+EQVVXvd15B07Svpmk+EL1e/H4/iqKgKAp+v5/1ek273SYWi93snCAajV62Wq3u4eEhmUwGIQQ+nw+A/f19ms0mk8lEzmazD/CwN9un/LUHtVrtbb/fv0okEpyennJ0dMRgMKDX63F7eys9Hs+n2WyWBerVarX4BLAJ69VoNKoPBoPj1WolVFW91zTtJhQKXeTz+W+6rn8GXgJfgLNKpWL/AfibdF3XNmYVsIGzvX9yblStVi3gcnNUgRf8z2/Udf1C1/XXUsqHDJ6jn9maCAp43gnmAAAAAElFTkSuQmCC';
      zoomOut.classList.add('soc_zoom');
      zoomOut.addEventListener('click', function(e) {});
      favoriteVideos.appendChild(zoomOut);
    }
  }

  initialize();
})();