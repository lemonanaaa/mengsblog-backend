const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mengsblog', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// 获取ShootSession模型
const ShootSession = require('../src/modules/photo/models/ShootSession');

async function removeStatusField() {
  try {
    console.log('开始清理status字段...');
    
    // 更新所有文档，移除status字段
    const result = await ShootSession.updateMany(
      {}, // 匹配所有文档
      { $unset: { status: "" } } // 移除status字段
    );
    
    console.log(`成功清理 ${result.modifiedCount} 个文档的status字段`);
    
    // 验证清理结果
    const remainingDocs = await ShootSession.find({ status: { $exists: true } });
    if (remainingDocs.length === 0) {
      console.log('✅ status字段已完全清理');
    } else {
      console.log(`⚠️ 仍有 ${remainingDocs.length} 个文档包含status字段`);
    }
    
  } catch (error) {
    console.error('清理status字段失败:', error);
  } finally {
    mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

removeStatusField();
