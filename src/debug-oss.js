require('dotenv').config();

console.log('🔍 详细OSS配置检查...\n');

// 检查环境变量
console.log('📋 环境变量检查:');
console.log('- ALIYUN_OSS_ACCESS_KEY_ID:', process.env.ALIYUN_OSS_ACCESS_KEY_ID ? '已配置' : '未配置');
console.log('- ALIYUN_OSS_ACCESS_KEY_SECRET:', process.env.ALIYUN_OSS_ACCESS_KEY_SECRET ? '已配置' : '未配置');
console.log('- ALIYUN_OSS_BUCKET:', process.env.ALIYUN_OSS_BUCKET || '未配置');
console.log('- ALIYUN_OSS_REGION:', process.env.ALIYUN_OSS_REGION || '未配置');
console.log('- ALIYUN_OSS_ENDPOINT:', process.env.ALIYUN_OSS_ENDPOINT || '未配置');

// 检查OSS模块
try {
  const { uploadToOSS } = require('./config/oss');
  console.log('\n✅ OSS模块加载成功');
  
  // 测试上传功能
  console.log('\n🧪 测试OSS上传功能...');
  
  // 创建一个模拟文件对象
  const mockFile = {
    buffer: Buffer.from('test image data'),
    size: 20,
    mimetype: 'image/jpeg'
  };
  
  console.log('模拟文件:', {
    size: mockFile.size,
    mimetype: mockFile.mimetype
  });
  
  // 测试上传
  uploadToOSS(mockFile, 'test-image.jpg')
    .then(result => {
      console.log('上传测试结果:', result);
      if (result.success) {
        console.log('✅ OSS上传功能正常');
        console.log('- 文件Key:', result.key);
        console.log('- 前端URL:', result.frontendUrl);
        console.log('- 缩略图URL:', result.thumbnailUrl);
      } else {
        console.log('❌ OSS上传失败:', result.error);
      }
    })
    .catch(error => {
      console.error('❌ 上传测试异常:', error);
    });
    
} catch (error) {
  console.error('❌ OSS模块加载失败:', error.message);
}

console.log('\n🔍 检查完成');
