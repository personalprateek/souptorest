'use strict';
module.exports = function(logger, prefix) {
    /* 
     * Configuration Loading
     *   + Redis will store all the application configuration using env: values format
     *   + Redis connection information will be provided either through command line or config file.
     * Logger Initialization
     * Initialize database(s)
     * Initialize modules - common services, routing services, acls, routes
     * Load the static data to redis / cache provider
     * Initialize routes and start the server
     */
    var cfg = require('config'),
        Promise = require('bluebird'),
        _ = require('./startup/load-lodash')(),
        config = {},
        sequelize, loadInitialData = require('./startup/load-initial-data'),
        path = require('path'); //,promClient = require('prom-client');

    Promise.config({
        longStackTraces: true
    });

    ///////////////////////////// Startup Service functions //////////////////////////
    process.on('uncaughtException', function(err) {
        console.error(`Caught exception: ${err}`);
        if (logger) {
            logger.error(`Caught exception: `, err.stack || err);
        }
    });

    process.on('unhandledRejection', function(reason, p) {
        logger.error('Unhandled Rejection from promise : ', { promise: p, reason: reason });
    });

    /**
     * Actual Logic stays like this
     * config: Configuration + Service registry
     *    - services: All those services from ./services directory
     *    - svc: All those services from ./svc directory
     *    - operations: All Operations defined in routes inside routes directory
     *    - utils: Utilities that can be called anywhere like handleBars
     *    - cache-Provider: Redis based cache provider
     *    - aclHandlers: Access Control Handlers defined within ./access-control directory 
     */
    logger.info('---- Initial Setup started ----');
    return Promise.try(() => {
        return require('./startup/load-config')(cfg, logger, _);
    }).then((configInst) => {
        config = _.merge(_.clone(cfg), configInst);
        config.logger = logger;
        config.appUrl = config.url ? config.url : (config.protocol || 'http://') + (process.env.UI_IP || 'localhost') +
            (process.env.UI_PORT ? ':' + process.env.UI_PORT : '') + (process.env.UI_SUFFIX || '');
        config.empUiUrl = config.url ? config.url : (config.protocol || 'http://') + (process.env.UI_IP || 'localhost') +
            (process.env.UI_PORT ? ':' + process.env.UI_PORT : '') + (process.env.EMP_UI_SUFFIX || '');
        config.apiBaseUrl = config.url ? config.url : (config.protocol || 'http://') + (process.env.MY_IP || 'localhost') +
            (process.env.MY_PORT ? ':' + process.env.MY_PORT : '') + (process.env.MY_SUFFIX || '');
        logger.info('Loading Kue');
        if (config.takeHeapDump) {
            config.heapDumper = require('./utils/heap-dump');
            config.heapDumper.init(config.tmpFolder, prefix);
        }
        return require('./startup/load-kue')(config);
    }).then((queueInfo) => {
        config = _.merge(config, queueInfo);
        logger.info('Loading Database: ');
        return require('./startup/load-database')(config, _);
    }).then((seq) => {
        sequelize = seq;
        config.publisher = require('./utils/publisher')(config, _, sequelize);
        config.subscriber = require('./utils/subscriber')(config, _, sequelize);
        logger.info('Loading Modules');
        return require('./startup/load-modules')(config, _, sequelize);
    }).then((modules) => {
        config = _.merge(config, modules);
        logger.info('Loading Handlebar templates');
        return config.utils.loadHandlebarTemplates(config.templatesFolder);
    }).then(function(templates) {
        config.templates = templates;
        logger.info('Configuration Templates : Print : ' + _.keys(templates.print));
        logger.info('Loading Initial Data');
        return config.utils.loadFiles(path.join(config.templatesFolder, 'exports'), '', (file) => {
            return config.services.commonXlParser(file);
        });
    }).then((exportTemplates) => {
        config.exportTemplates = exportTemplates;
        config.loadInitialData = loadInitialData;
        return loadInitialData(config, _, sequelize);
    }).then((data) => {
        config = _.merge(config, data);
        logger.info('Storing initial data to cache');
        return config.Promise.resolve(_.map(data, (value, key) => {
            return config.cacheProvider.set(key, value).reflect();
        }));
    }).then(() => {
        return Promise.resolve({ database: sequelize, config: config, lodash: _ });
    });
};
