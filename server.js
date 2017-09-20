'use strict';
module.exports = function() {
    let server, Controller, config, database, _ = require('./startup/load-lodash')();
       // logger = require('./startup/load-logger')(_.clone(require('config')));
    const loadApp = require('./load-app'),
        path = require('path');

    process.on('SIGINT', () => {
        // Do any clean up required
        console.error(process.pid + 'SIGINT Received: ' + process.pid);
        console.log(process.pid + 'SIGINT Received: ' + process.pid);
        if (config && config.logger) {
            config.logger.info(process.pid + 'SIGINT Received:' + process.pid);
        }
        shutdown();
    });

    process.on('message', (msg) => {
        config.logger.info(process.pid + ' Message Received: ', msg.message);
        console.log(process.pid + 'Message Received: ' + ' ' + msg.message);
        if (msg.message === 'shutdown') {
            shutdown();
        }
        if (msg && typeof msg === 'object' && msg.channel === 'data-change' && msg.data) {
            config = _.merge(config, msg.data);
        }
    });

    function shutdown() {
        if (server) {
            console.log('Closing the server...');
            server.close();
            server = undefined;
        }
        if (config && config.queue) {
            console.log('Closing the queue');
            config.queue.shutdown(5000, function(err) {
                config.logger.info('Kue shutdown: ', err || '');
                process.exit(0);
            });
        }
        const killtimer = setTimeout(function() {
            console.log('Exiting the process');
            // 300ms later the process kill it self to allow a restart
            process.exit(0);
        }, 300);
        killtimer.unref();
    }

    function loadRouteModule(config, _, database, module, key) {
        config.logger.debug('Loading Route Module :' + key);
        var moduleExport = module(config, _, database);
        return _.map(_.flatten([moduleExport]), function(value) {
            var cntr = new Controller(value);
            if (value.isGlobal && !value.aclHandler) {
                value.aclHandler = value.aclHandler || config.aclHandlers.defaultAllowHandler;
            } else if (!value.aclHandler) {
                value.aclHandler = config.aclHandlers.defaultAclHandler;
            }
            server[value.method](value.pattern, cntr.handleAcl.bind(cntr), cntr.handleRequest.bind(cntr));
            return value;
        });
    }

    function loadAndstartServer(server) {
        var port = config.port || 9090;
        config.logger.info('loadAndStartServer(' + port + ') : ', server.router.reverse);
        return new Promise((resolve) => {
            server.listen(port, function() {
                config.logger.info('%s listening at %s', server.name, server.url);
                config.logger.info(server.name + ' listening at ' + server.url);
                config.logger.info('AppUrl = ' + config.appUrl);
                config.logger.info('Routes : ', server.router.reverse);
                resolve(server);
            });
        });
    }


    function loadPaymentHandlers(server) {
        var handlers = {
            payHandler: require('./request-handlers/ccavenue/paynow')(config, _, database),
            paymentSuccessHandler: require('./request-handlers/ccavenue/paymentsucceeded')(config, _, database),
            paymentCancelledHandler: require('./request-handlers/ccavenue/paymentcancelled')(config, _, database),
            getDataHandler: require('./request-handlers/ccavenue/get-initial-data')(config, _, database),
            insmojoGetDataHandler: require('./request-handlers/instamojo/get-initial-data')(config, _, database)
        };
        server.post(config.baseUrl + '/ccavenue/paynow', handlers.payHandler);
        server.post(config.baseUrl + '/ccavenue/paymentsucceeded', handlers.paymentSuccessHandler);
        server.post(config.baseUrl + '/ccavenue/paymentcancelled', handlers.paymentCancelledHandler);
        server.get(config.baseUrl + '/ccavenue/paymentsucceeded', handlers.paymentSuccessHandler);
        server.get(config.baseUrl + '/ccavenue/paymentcancelled', handlers.paymentCancelledHandler);
        server.get(config.baseUrl + '/ccavenue/getdata/:amount', handlers.getDataHandler);
        server.get(config.baseUrl + '/instamojo/getdata/:amount', handlers.insmojoGetDataHandler);
    }

    return loadApp(logger).then((data) => {
        // console.log('data keys ', data);
        config = data.config;
        database = data.database;
        _ = data.lodash;
        config.logger.info('Loading Server...: ', _);
        server = require('./create-server')(config, config.baseUrl || '/api', database, _, true);
        server.use(require('./access-control/acl')(config, _));
        var loadFiles = require('./startup/load-files')(config, _),
            loadRoute = _.partial(loadRouteModule, config, _, database);
        Controller = require('./utils/controller')(config, _);
        config.logger.info('Loading Routes');
        return loadFiles(path.join(process.cwd(), 'src/routes'), loadRoute);
    }).then((routes) => {
        loadRouteModule(config, _, database, require('./others/routes'), 'others-log-routes');
        config.operations = _.transform(_.flatten(_.values(routes)), (result, value) => {
            if (value.name) {
                result[value.name] = value;
            }
            return result;
        }, {});
        require('./utils/load-operation-apis')(config, _)(server, config.operations);
        config.logger.info({
            services: _.keys(config.routes)
        }, 'All Dependencies loaded!');
        config.logger.info('Loading Payment Handlers');
        loadPaymentHandlers(server);
        config.logger.info('Loading/Starting Server');
        return loadAndstartServer(server);
    }).then(() => {
        config.logger.info('Server started! ', {
            routes: server.router.reverse
        });
        return config.Promise.resolve(server);
    }).catch(err => {
        if (server) {
            server.close();
            server = undefined;
        }
        var logger = config ? config.logger : console;
        logger.error('Error Caught starting Server: ', { err: err, stack: err.stack || err });
        throw err;
    }).error(err => {
        var logger = config ? config.logger : console;
        logger.error('Operational Error starting Server: ', { err: err, stack: err.stack || err });
        throw err;
    });
};