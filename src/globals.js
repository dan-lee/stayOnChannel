function truth(assert, returnValue, strict) {
  strict = strict || true;
  return ((strict && assert === true) || (!strict && assert == true)) && returnValue || '';
}

function getParameterByName(name, location) {
  var match = new RegExp('[?&]' + name + '=([^&]*)').exec(location);
  return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
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