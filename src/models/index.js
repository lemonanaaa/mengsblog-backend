const { sequelize } = require('../config/database');

// 导入模型
const Blog = require('./Blog')(sequelize);
const Category = require('./Category')(sequelize);
const Tag = require('./Tag')(sequelize);

// 建立模型关联
const models = { Blog, Category, Tag };

Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});

module.exports = models; 