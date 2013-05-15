var request = require('request');
var archiveDownloadExtract = require('./archive-download-pipe-extract');

module.exports = function (args, sourcePath, status, cb) {
  var lastTimestamp = status || 0;
  var req_args = {
    uri: args.url,
    headers: {
      'If-Modified-Since': (new Date(lastTimestamp)).toUTCString()
    }
  };
  
  request.head(req_args, function(error, response, body) {
    if (error) {
      cb(error);
    } else {
      var newTimestamp = response.headers['last-modified'] ? Date.parse(response.headers['last-modified']) : Date.now();
      if (response.statusCode == 304 || newTimestamp <= lastTimestamp) {
        console.log('archive: %s not modified', args.url);
        cb(null, lastTimestamp);
      } else if (response.statusCode == 200) {
        var url = response.request.href; // redirect followed
        console.log('archive: downloading %s', url)
        archiveDownloadExtract(url, sourcePath, function(err) {
          if (err) {
            cb(err);
          } else {
            cb(null, newTimestamp);
          }
        });
      } else {
        cb(new Error('archive: unexpected status code %d from %s', response.statusCode, url));
      }
    }
  });
}