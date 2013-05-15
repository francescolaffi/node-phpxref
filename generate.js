#!/usr/bin/env node

/*
todo:
concurrency
config format
*/

var path = require('path');
var fs = require('fs-extra');

var conf = require('./config.json');

var sourcesDirName = conf.sourcesDir || 'sources';
var outputDirName = conf.outputDir || 'public';

var rootPath = __dirname;
var sourcesPath = exports.sourcesPath = path.join(rootPath, sourcesDirName);
var outputPath  = exports.outputPath  = path.join(rootPath, outputDirName);
var phpxrefPath = exports.phpxrefPath = path.join(rootPath, 'phpxref'); 

fs.mkdirpSync(sourcesPath);
fs.mkdirpSync(outputPath);
fs.mkdirpSync(phpxrefPath);

var phpxref = exports.phpxref = require('./inc/phpxref').createPhpXref(phpxrefPath);

var projSourceHandlers = {};

function Project (name) {
  this.name = name;
}
Project.prototype = {
  get sourcePath() { return path.join(sourcesPath, this.name) },
  get outputPath() { return path.join(outputPath, this.name) },
  get statusPath() { return path.join(sourcesPath, this.name+'.json') },
  get status() { return this._status || (this._status = fs.existsSync(this.statusPath) ? fs.readJSONSync(this.statusPath) : null); },
  set status(value) { return fs.writeJSONSync(this.statusPath, this._status = value); }
};

if (require.main === module) {
  phpxref.checkInstallation(function(err) {
    if(!err) {
      runAll();
    }
  });
}

function runAll () {
  var projects = conf.projects;
  
  var doNothing = function () {};
  
  for (var projName in projects) {
    runProj(new Project(projName), projects[projName], doNothing);
  }
}

function runProj(project, sourceArgs, cb) {
  console.log('%s: updating source', project.name);
  updateProjSource(project, sourceArgs, function (err, updated){
    if (err) {
      console.log('%s: error updating source', project.name);
      console.log(err);
    } else if (updated) {
      console.log('%s: source updated', project.name);
      generateProjXref(project, cb);
    } else {
      console.log('%s: already up to date', project.name);
    } 
  });
}

function updateProjSource (project, sourceArgs, cb) {
  handleSource(sourceArgs, project.sourcePath, project.status, function (err, newStatus){
    if (err) {
      cb(err);
    } else if (project.status !== newStatus) {
      project.status = newStatus;
      cb(null, true)
    } else {
      cb(null, false);
    } 
  });
}

function handleSource (args, sourcePath, status, cb) {
  if (!projSourceHandlers[args.type]) {
    try {
      projSourceHandlers[args.type] = require(path.join(rootPath, 'inc', args.type+'-source-handler.js'));
    } catch (e) {
      cb(new Error('handler '+args.type+' not found: '+e.message));
      return;
    }
  }
  fs.mkdirpSync(sourcePath);
  projSourceHandlers[args.type](args, sourcePath, status, cb);
}

function generateProjXref (project) {
  console.log('%s: generating phpxref', project.name);
  fs.deleteSync(project.outputPath);
  fs.mkdirpSync(project.outputPath);
  phpxref.generate(project.name, project.sourcePath, project.outputPath, function (er) {
    if (er) {
      console.log('%s: phpxref error:\n%s', project.name, er);
    } else {
      console.log('%s: phpxref generated in %s', project.name, project.outputPath);
    }
  });
}

exports.checkSetup = phpxref.checkInstallation.bind(phpxref);
exports.runAll = runAll;
exports.runProj = runProj;
