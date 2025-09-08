const OSS = require('ali-oss');
require('dotenv').config();

// OSS客户端配置
const ossClient = new OSS({
  region: process.env.ALIYUN_OSS_REGION || 'oss-cn-shanghai',
  accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
  bucket: process.env.ALIYUN_OSS_BUCKET || 'mengsblog-photos',
  endpoint: process.env.ALIYUN_OSS_ENDPOINT || 'oss-cn-shanghai.aliyuncs.com'
});

// 验证OSS连接
const testConnection = async () => {
  try {
    await ossClient.listBuckets();
    console.log('✅ 阿里云OSS连接成功');
    return true;
  } catch (error) {
    console.error('❌ 阿里云OSS连接失败:', error.message);
    return false;
  }
};

// 上传文件到OSS
const uploadToOSS = async (file, filename, folder = 'photos') => {
  try {
    const key = `${folder}/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${filename}`;
    
    const result = await ossClient.put(key, file.buffer, {
      headers: {
        'Content-Type': file.mimetype,
        'Cache-Control': 'max-age=31536000' // 1年缓存
      }
    });
    
    // 生成前端可访问的URL
    const frontendUrl = `https://${process.env.ALIYUN_OSS_BUCKET}.${process.env.ALIYUN_OSS_ENDPOINT}/${key}`;
    
    // 生成缩略图URL（使用OSS图片处理服务）
    const thumbnailUrl = `https://${process.env.ALIYUN_OSS_BUCKET}.${process.env.ALIYUN_OSS_ENDPOINT}/${key}?x-oss-process=image/resize,w_300,h_300,m_fill`;
    
    return {
      success: true,
      url: result.url,
      frontendUrl: frontendUrl, // 前端访问URL
      thumbnailUrl: thumbnailUrl, // 缩略图URL
      key: key,
      size: file.size,
      mimetype: file.mimetype
    };
  } catch (error) {
    console.error('OSS上传失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 从OSS删除文件
const deleteFromOSS = async (key) => {
  try {
    await ossClient.delete(key);
    return { success: true };
  } catch (error) {
    console.error('OSS删除失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 批量删除文件
const batchDeleteFromOSS = async (keys) => {
  try {
    if (keys.length === 0) return { success: true };
    
    const result = await ossClient.deleteMulti(keys);
    return {
      success: true,
      deleted: result.deleted,
      failed: result.failed
    };
  } catch (error) {
    console.error('OSS批量删除失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 获取文件访问URL
const getFileUrl = (key, expires = 3600) => {
  try {
    return ossClient.signatureUrl(key, { expires });
  } catch (error) {
    console.error('生成文件URL失败:', error);
    return null;
  }
};

module.exports = {
  ossClient,
  testConnection,
  uploadToOSS,
  deleteFromOSS,
  batchDeleteFromOSS,
  getFileUrl
};
