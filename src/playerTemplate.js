var playerTemplate = {
  id: 'movie_player',
  template: function() {
    return [
    '<div class="channels-featured-video $(customClass) channel-module yt-uix-c3-module-container has-visible-edge">',
    '  <div class="module-view featured-video-view-module">',
    '    <div id="',this.id,'"></div>',
    '    <div class="channels-featured-video-details yt-tile-visible clearfix">',
    '      <h3 class="title">',
    '        <a href="/watch?v=$(videoId)">$(title)</a>',
    '        <div class="view-count-and-actions"><div class="view-count"><span class="count">$(views)</span> views</div></div>',
    '      </h3>',
    '      <p class="channels-featured-video-metadata">',
    '        <span>$(creator)</span> <span class="created-date">$(created)</span>',
    '      </p>',
    '    </div>',
    '  </div>',
    '</div>'].join('');
  },

  get: function(vars, withMargin) {
    vars.customClass = withMargin ? 'soc_channel-module-margin' : 'soc_channel-module';
    return this.template().replace(/\$\((\w+)\)/g, function($0, $1) {
      return ($1 in vars ? vars[$1] : '');
    });
  }
};