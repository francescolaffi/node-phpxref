var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;

module.exports = function (args, sourcePath, status, cb) {
  var repoExists = fs.existsSync(path.join(sourcePath,'.svn'));
  
  console.log(repoExists ? 'svn: updating repo in %s' : 'svn: checking out in %s', sourcePath);
  
  var svnCommand = repoExists ? 'up' : 'co '+args.url+' .';
  
  exec('svn '+svnCommand+' -q --non-interactive', {cwd: sourcePath},
    function (error, stdout, stderr) {
      if (error) return cb(error);
      exec('svnversion', {cwd: sourcePath},
        function (error, stdout, stderr) {
          cb(error, parseInt(stdout, 10));
        }
      );      
    }
  );
}