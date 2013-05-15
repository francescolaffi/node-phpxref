var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;

module.exports = function (args, sourcePath, status, cb) {
  var repoExists = fs.existsSync(path.join(sourcePath,'.git'));
  
  console.log(repoExists ? 'git: pull changes in repo %s' : 'git: cloning to %s', sourcePath);
  
  var gitCommand = repoExists ? 'pull' : 'clone '+args.url;
  
  exec('git '+gitCommand+' -q', {cwd: sourcePath},
    function (error, stdout, stderr) {
      if (error) return cb(error);
      exec('git rev-parse HEAD', {cwd: sourcePath},
        function (error, stdout, stderr) {
          cb(error, stdout);
        }
      );      
    }
  );
}