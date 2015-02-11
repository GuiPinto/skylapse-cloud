var skycloud = require('../controllers/skycloud');

module.exports = function (router) {

    router.get('/', skycloud.index);

    router.post('/skycloud', skycloud.upload);

};
