var temp = require('temp');
var request = require('request');
var spawn = require('child_process').spawn;
var fs = require('fs-extra');
var path = require('path');

module.exports = function (url, extractPath, cb) {
  var req = request.get(url);
  req.on('error', function (er) { cb(er) });
  req.on('response', function (response) {
    if (response.statusCode !== 200) {
      return cb(new Error('archive: unexpected status code '+response.statusCode+' from '+url));
    }
    var stream = temp.createWriteStream();
    var tmpFilePath = stream.path;
    var tmpDirPath = temp.mkdirSync();
    
    var extractCommandSpawnArgs;
    switch (response.headers['content-type']) {
      case 'application/x-gzip':
      case 'application/gzip':
        var gzip = true;
      case 'application/x-tar':
        extractCommandSpawnArgs = ['tar', [gzip?'-xzf':'-xf', tmpFilePath], {cwd: tmpDirPath}];
        break;
      case 'application/octet-stream':
      case 'application/zip':
        extractCommandSpawnArgs = ['unzip', [tmpFilePath], {cwd: tmpDirPath}];
        break;
      default:
        return cb(new Error('archive: unsupported content type '+response.headers['content-type']+' from '+url));
    }
    
    req.pipe(stream);
    
    stream.on('close', function() {
      var child, stdout = '', stderr = '';
      
      child = spawn.apply(null, extractCommandSpawnArgs);
      child.stdout.on('readable', function() { stdout += child.stdout.read() || '' });
      child.stderr.on('readable', function() { stderr += child.stderr.read() || '' });
      child.on('error', function (er) { cb(er) });
      child.on('close', function (exitCode, signal) {
        fs.deleteSync(tmpFilePath);
        
        if (signal) {
          return cb(new Error('archive: extraction killed with '+signal));
        }
        if (exitCode !== 0 || stderr) {
          return cb(new Error('archive: execution error (exit code '+exitCode+'): '+stderr));
        }
        
        // if extracted in a subfolder remove one level and copy that subfolder contents
        var extractedFiles = fs.readdirSync(tmpDirPath);
        var firstFilePath = path.join(tmpDirPath, extractedFiles[0]);
        var areContentsInSubfolder = extractedFiles.length == 1 && fs.statSync(firstFilePath).isDirectory();
        var actualDirPath = areContentsInSubfolder ? firstFilePath : tmpDirPath;
        
        fs.deleteSync(extractPath);
        fs.mkdirpSync(extractPath);
        fs.copy(actualDirPath, extractPath, function(err) {
          fs.deleteSync(tmpDirPath);
          cb(err);
        });
      });          
    });
  });
}