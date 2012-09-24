function truth(assert, returnValue) {
  return assert == true && returnValue || '';
}

function getParameterByName(name, location) {
  var match = new RegExp('[?&]' + name + '=([^&]*)').exec(location);
  return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

String.prototype.separateThousandth = function() {
  return this.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

function doGetRequest(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      callback(xhr.responseText);
    }
  };
  xhr.open('GET', url, true);
  xhr.send();
}

function getVideoInfo(videoId, callback) {
  // unfortunately the more verbose 'json', instead of 'jsonc' is needed to get the correct cased user name
  // ('jsonc' forces the user name to lower case)
  var apiVideoUrl = 'https://gdata.youtube.com/feeds/api/videos/'+videoId+'?v=2&alt=json';

  doGetRequest(apiVideoUrl, function(response) {
    response = JSON.parse(response).entry;

    callback({
      videoId: videoId,
      title: response['title']['$t'],
      views: response['yt$statistics']['viewCount'].separateThousandth(),
      creator: 'by '+response['author'][0]['name']['$t'],
      created: prettyDate(response['published']['$t'])
    });
  });
}

// kudos to John Resig and Dean Landolt (http://ejohn.org/blog/javascript-pretty-date/#comment-297470)
function prettyDate(str) {
  var time_formats = [
    [60, 'just now', 1],
    [120, '1 minute ago', '1 minute from now'],
    [3600, 'minutes', 60],
    [7200, '1 hour ago', '1 hour from now'],
    [86400, 'hours', 3600],
    [172800, 'yesterday', 'tomorrow'],
    [604800, 'days', 86400],
    [1209600, 'last week', 'next week'],
    [2419200, 'weeks', 604800],
    [4838400, 'last month', 'next month'],
    [29030400, 'months', 2419200],
    [58060800, 'last year', 'next year'],
    [2903040000, 'years', 29030400],
    [5806080000, 'last century', 'next century'],
    [58060800000, 'centuries', 2903040000]
  ];

  var time = ('' + str).replace(/-/g, '/').replace(/[TZ]/g, ' ');
  var seconds = (new Date - new Date(time)) / 1000;
  var token = 'ago',
    list_choice = 1;
  if (seconds < 0) {
    seconds = Math.abs(seconds);
    token = 'from now';
    list_choice = 2;
  }
  var i = 0,
    format;
  while (format = time_formats[i++]) if (seconds < format[0]) {
    if (typeof format[2] == 'string') return format[list_choice];
    else return Math.floor(seconds / format[2]) + ' ' + format[1] + ' ' + token;
  }
  return time;
}

function parseUrl(urlString) {
  var a = document.createElement('a');
  a.href = urlString;
  return a;
}

function getQueryParam(name, url) {
  var parsedUrl = parseUrl(url);
  return getParameterByName(name, parsedUrl);
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