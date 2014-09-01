module.exports = run

var spawn     = require('child_process').spawn
  , freeport  = require('freeport')
  , fs        = require('fs')

/**
  * The engine that will start the java selenium server
  */
function run(op, cb) {
  cb = cb || function(){}
  if (!op.port) {
    // no port? get one
    freeport(_run)
  } else {
    // run on the port give.  if it is taken, there will be an error....
    _run(null, op.port)
  }

  // helper function to deal with optional port
  function _run(e, port) {
    if (e) throw e

    // base arguments
    var javaArgs = ['-jar', op.selenium.file, '-port', port]
    // add optional arguments
    if (op.java) {
      javaArgs = javaArgs.concat(op.java)
    }
    // add driver arguments
    if (op.drivers) {
      javaArgs = javaArgs.concat(op.drivers.map(function(i) {
        return '-Dwebdriver.'+i.name+'.driver='+i.file
      }))
      javaArgs.push('-DDwebdriver.phantomjs.driver='+__dirname+'/node_modules/.bin/phantomjs')
    }
    // let people know we are starting
    console.log('Starting Selenium on port: ' + port)
    if (op.debugJava) {
      // if you want to know everything...
      console.log('Starting java with args', javaArgs)
    }

    // start the process
    var child = spawn('java', javaArgs)
    // set some values on our return object
    child.host = '127.0.0.1'
    child.port = port

    // logs are good. use one
    if (op.log) {
      if (op.log instanceof require('stream').Stream) {
        var _log = op.log
      } else {
        var _log = fs.createWriteStream(op.log)
      }
      child.stdout.pipe(_log)
      child.stderr.pipe(_log)
    }

    // make sure we start up, just because the process is
    // started, does not mean the server is ready...
    // this is a quick and simple check
    child.stdout.on('data', function checkData(data) {
      var sentinal = 'Started org.openqa.jetty.jetty.Server'
      if (data.toString().indexOf(sentinal) != -1) {
        // everything is good, remove our listener becuase
        // we don't need them anymore
        child.stdout.removeListener('data', checkData)
        child.removeListener('exit', badExit)
        // everything is good, send the process back with love
        cb(null, child)
      }
    })
    child.on('exit', badExit)
    function badExit() {cb(new Error('Error starting Selenium'))}
  }
}