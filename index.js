var morgan = require('morgan');
var _ = require('underscore');
var fs = require('fs');
var FileStreamRotator = require('file-stream-rotator');
var util = require('util');

// default logFormat
var  logFormat = '{status: :status, method: ":method", url: ":url", resContentLength: :res[content-length], referrer: ":referrer"}';  // combined common dev short tiny - :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"


/*
 * enable/overwrite console
 * log to files
 * send mail
 */
module.exports = function(app, options){
    // options
    options = _.extend({
        level: 'warn',
        debug: true,
        color: true,
        mail: {
            send: function(data){
                data = _.extend({
                    subject: 'logger',
                    text: ''
                }, data);
            }
        },
        log: {
            dir: './tmp/log',
            accessFile: 'access-%DATE%.log',  // false to disable
            errorFile: 'error-%DATE%.log',
            logFormatAccess: '{status: :status, method: ":method", url: ":url", res: {length: ":res[content-length]", time: :response-time}, referrer: ":referrer"}',
            logFormatError: '{status: :status, method: ":method", url: ":url", res: {length: ":res[content-length]", time: :response-time}, referrer: ":referrer"}'
        }
    }, options);

    // writeStreams
    fs.existsSync(options.log.dir) || fs.mkdirSync(options.log.dir);
    var logStreamAccess = null;
    if(options.log.accessFile){
        logStreamAccess = FileStreamRotator.getStream({
            filename: options.log.dir + '/' + options.log.accessFile,
            frequency: 'daily',
            verbose: false,
            date_format: "YYYY-MM-DD"
        });
    }

    var logStreamError = FileStreamRotator.getStream({
        filename: options.log.dir + '/' + (options.log && options.log.errorFile || 'error.log'),
        frequency: 'daily',
        verbose: false,
        date_format: "YYYY-MM-DD"
    });



    if(options.debug){
        app.use(function(req, res, next) {
            console.log('############ REQUEST - req.url = "%s" #############', req.url);
            next();
        });
    }

    app.use(morgan(options.log.logFormatError || logFormat, {
        skip: function (req, res) {
            if(res.statusCode > 310){
                // error
                console.warn('middlewareHttpStatusException / res.statusCode: '+res.statusCode+' / req.url: '+req.url);
                return false;
            }
            return true;  // skip
        },
        stream: logStreamError
    }));

    if(logStreamAccess){
        app.use(morgan(options.log.logFormatAccess || logFormat, {
            skip: function (req, res) {
                return res.statusCode > 310;
            },
            stream: logStreamAccess
        }));
    }

    app.use(function(err, req, res, next) {
        if(!err) return next();
        console.error('middlewareErrorException [Status 500]', err, err.stack);
        res.status(500).render('500');
    });

    /*
     * modify console for dev and production
     */
    if(options.debug){
        var fmt = "\033[%dm%s\033[37m\n";
        console.log = console.info = console.warn = function(){};

        if(['info'].indexOf(options.level) > -1){
            console.info = function() {
                process.stdout.write(util.format(fmt, 37, '[INFO] '+util.format.apply(this, arguments)));
            };
        }

        if(['info', 'log'].indexOf(options.level) > -1){
            console.log = function() {
                process.stdout.write(util.format(fmt, 33, '[LOG] '+util.format.apply(this, arguments)));
            };
        }

        if(['info', 'log', 'warn'].indexOf(options.level) > -1){
            console.warn = function() {
                var message = util.format.apply(this, arguments);
                process.stderr.write(util.format(fmt, 35, '[WARN] '+message));
                options.mail && options.mail.send({subject: 'ZCMS-Warn', text: message});
                logStreamError.write('{warn: '+message+'}\n');
            };
        }

        console.error = function() {
            var message = util.format.apply(this, arguments);
            process.stderr.write(util.format(fmt, 31, '[ERROR] '+message));
            options.mail && options.mail.send({subject: 'ZCMS-Error', text: message});
            logStreamError.write('{error: '+message+'}\n');
        };
    }else{
        console.log = console.info = console.count = console.time = console.timeEnd = console.warn = console.error = function(){};
        if(options.log){
            console.warn = function() {
                var message = util.format.apply(this, arguments);
                options.mail && options.mail.send({subject: 'ZCMS-Warn', text: message});
                logStreamError.write('{warn: '+message+'}\n');
            };
            console.error = function() {
                var message = util.format.apply(this, arguments);
                options.mail && options.mail.send({subject: 'ZCMS-Error', text: message});
                logStreamError.write('{error: '+message+'}\n');
            };
        }
    }

};

process.on('uncaughtException', function(err){
    console.error('uncaughtException', err, err.stack);
});
