// Photo模块入口文件
const photoRoutes = require('./routes/photoRoutes');
const photoController = require('./controllers/photoController');

module.exports = {
  routes: photoRoutes,
  controllers: {
    photo: photoController
  }
};
