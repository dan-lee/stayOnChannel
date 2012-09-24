var playerTemplate = {
  template: (<><![CDATA[
<div class="module-view featured-video-view-module">
  <div id="movie_player" class="html5-video-player el-profilepage ps-default autohide-fade html5-before-playback cued-mode hide-controls"></div>

  <div class="channels-featured-video-details yt-tile-visible clearfix">
    <h3 class="title">
      <a href="/watch?v=$(videoId)">$(title)</a>
      <div class="view-count-and-actions"><div class="view-count"><span class="count">$(views)</span> views</div></div>
    </h3>
    <p class="channels-featured-video-metadata">
      <span>$(creator)</span>
      <span class="created-date">$(created)</span>
    </p>
  </div>
</div>
  ]]></>).toString(),

  get: function(vars) {
    return this.template.replace(/\$\((\w+)\)/g, function($0, $1) {
      return ($1 in vars ? vars[$1] : '');
    });
  }
};