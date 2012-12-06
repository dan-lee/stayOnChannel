function Template() {}

Template.prototype.loadContent = function(url, callback) {
  doGetRequest(url, function(response) {
    this.setContent(response);
    callback.call(this, response);
  }.bind(this));
};

Template.prototype.setContent = function(str) {
  this.originalString = ''+str;
};

Template.prototype.setVars = function(vars) {
  this.replacedString = this.originalString.replace(/\[\[(\w+)\]\]/g, function($0, $1) {
    return ($1 in vars ? vars[$1] : '');
  });
};

Template.prototype.get = function() {
  return this.replacedString;
};