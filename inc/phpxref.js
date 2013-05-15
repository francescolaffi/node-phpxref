var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;
var ejs = require('ejs');
var temp = require('temp');
var archiveDownloadExtract = require('./archive-download-pipe-extract');

var defaultDownloadUrl = 'http://prdownloads.sourceforge.net/phpxref/phpxref-0.7.1.tar.gz';
var defaultConfigTemplate = path.join(__dirname, 'phpxref.cfg.ejs');

function PhpXref (phpxrefPath, options) {
  if (phpxrefPath) {
    this.pxrPath = phpxrefPath
  } else {
    throw new TypeError('missing phpxref path');
  }
  options = options || {};
  this.downloadUrl = options.downloadUrl || defaultDownloadUrl;
  this.configTemplate = options.configTemplate || defaultConfigTemplate;
}

PhpXref.prototype.execPath = function() {
  return path.join(this.pxrPath, 'phpxref.pl');
}

PhpXref.prototype.isInstalled = function() {
  return fs.existsSync(this.execPath());
}

PhpXref.prototype.download = function(cb) {
  archiveDownloadExtract(this.downloadUrl, this.pxrPath, cb);
}

PhpXref.prototype.checkInstallation = function(cb) {
  if (this.isInstalled()) {
    console.log('phpxref already installed in', this.pxrPath);
    cb();
  } else {
    console.log('downloading phpxref');
    var self = this;
    this.download(function(err){
      if (!err && !self.isInstalled()) {
        err = new Error('invalid phpxref downlaod')
      }
      if (err) {
        console.log('error downloading phpxref', err);
        cb(err);
      } else {
        console.log('phpxref installed in', self.pxrPath);
        cb();
      }
    }); 
  }
}

PhpXref.prototype.generate = function (name, source, output, cb) {
  // todo: check source, output exist
  var self = this;
  
  var renderOptions = {
    cache: true,
    locals: {
      name: name,
      source: source,
      output: output
    }
  };
  ejs.renderFile(this.configTemplate, renderOptions, function(err, compiledConfig) {
    if (err) {
      cb(err);
    } else {
      var tmpConfig = temp.path()
      fs.writeFileSync(tmpConfig, compiledConfig);
      
      child = exec('/usr/bin/env perl -X "'+self.execPath()+'" -c "'+tmpConfig+'"',
        { cwd: self.pxrPath },
        function (er, stdout, stderr) {
          if (er) {
            cb(er);
          } else if (stderr) {
            cb(new Error('stderr: '+stderr));
          } else {
            cb();
          }
          fs.unlinkSync(tmpConfig);
        }
      );
    }
  });
}

exports.PhpXref = PhpXref;
exports.createPhpXref = function (phpxrefPath, options) {
  return new PhpXref(phpxrefPath, options);
}