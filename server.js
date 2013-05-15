var path = require('path');
var connect = require('connect');
var gen = require('./generate');

var conf = require('./config.json').server;

var app = connect()
  .use(connect.favicon())
  //.use(connect.logger('dev'))
  .use(connect.static(gen.outputPath))
  .use(connect.directory(gen.outputPath))
  .listen(conf.port || 8080);
  
gen.checkSetup(function (er) {
  if(!er) {
    gen.runAll();
    setInterval(gen.runAll, conf.inteveral || 12*3600*1000);
  }
});