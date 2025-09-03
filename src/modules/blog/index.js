// Blog模块入口文件
const blogRoutes = require('./routes/blogRoutes');
const blogController = require('./controllers/blogController');
const categoryController = require('./controllers/categoryController');

module.exports = {
  routes: blogRoutes,
  controllers: {
    blog: blogController,
    category: categoryController
  }
};
