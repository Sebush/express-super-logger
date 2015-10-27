# express-super-logger

## installation

edit package.json and add this to the dependencies-object

    "express-super-logger": "git@github.com:Sebush/express-super-logger.git",

## usage

require('express-super-logger')(express_app, {
    level: 'warn',  // error, warn, log, info
    debug: true,  // console to cli
    color: true,  // error=red, warn=purple, log=yellow, info=white
    mail: require('./models/mail.js'),  // obj.send({subject: ..., text: ...})
    log: {
        dir: './tmp/log',
        accessFile: 'access-%DATE%.log',  // false to disable
        errorFile: 'error-%DATE%.log',
        logFormatAccess: ":status :method :url :res[content-length] (byte) :response-time (ms) :referrer",
        logFormatError: ":status :method :url :res[content-length] (byte) :response-time (ms) :referrer"
    }
});