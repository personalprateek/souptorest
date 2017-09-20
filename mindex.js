'use strict';
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'dev';
}
require('./server')().then(() => {
    console.log('Server stared !');
});