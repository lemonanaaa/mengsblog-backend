const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { uploadToOSS } = require('../../config/oss');

// 确保上传目录存在
const ensureUploadDirs = async () => {
  const dirs = [
    './uploads/photos',
    './uploads/retouched',
    './uploads/temp'
  ];
  
  for (const dir of dirs) {
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
      console.log(`创建目录: ${dir}`);
    }
  }
};

// 配置存储
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadDirs();
    
    // 根据文件类型选择存储目录
    if (file.fieldname === 'retouched') {
      cb(null, './uploads/retouched');
    } else {
      cb(null, './uploads/photos');
    }
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 允许的图片类型
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
    'image/bmp'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
  }
};

// 创建multer实例
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 默认50MB
    files: 100 // 最多100个文件
  }
});

// 统一的图片上传（支持普通图片和精修图片）
const uploadImages = upload.array('images', 100);

// 单张图片上传
const uploadSingle = upload.single('photo');

// 多张图片上传
const uploadMultiple = upload.array('photos', 100);

// 精修图片上传
const uploadRetouched = upload.single('retouched');

// 错误处理中间件
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件大小超出限制',
        error: `文件大小不能超过 ${process.env.MAX_FILE_SIZE || '50MB'}`
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: '文件数量超出限制',
        error: '最多只能上传100个文件'
      });
    }
    return res.status(400).json({
      success: false,
      message: '文件上传失败',
      error: error.message
    });
  }
  
  if (error.message.includes('不支持的文件类型')) {
    return res.status(400).json({
      success: false,
      message: '不支持的文件类型',
      error: error.message
    });
  }
  
  next(error);
};

// 获取文件信息的中间件
const getFileInfo = (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }
  
  const files = req.files || [req.file];
  
  // 为每个文件添加额外信息
  req.fileInfos = files.map(file => ({
    filename: file.filename,
    originalName: file.originalname,
    filePath: file.path,
    fileSize: file.size,
    mimeType: file.mimetype,
    fieldname: file.fieldname,
    // 根据字段名判断是否为精修图片
    isRetouched: file.fieldname === 'retouched'
  }));
  
  next();
};

// OSS上传中间件
const uploadToOSSMiddleware = async (req, res, next) => {
  if (!req.fileInfos || req.fileInfos.length === 0) {
    return next();
  }
  
  try {
    // 上传所有文件到OSS
    const ossResults = await Promise.all(
      req.fileInfos.map(async (fileInfo) => {
        const file = req.files ? 
          req.files.find(f => f.filename === fileInfo.filename) : 
          req.file;
        
        if (!file) return fileInfo;
        
        // 上传到OSS
        const ossResult = await uploadToOSS(file, fileInfo.filename);
        
        if (ossResult.success) {
          // 更新文件信息，添加OSS相关字段
          fileInfo.ossKey = ossResult.key;
          fileInfo.ossUrl = ossResult.url;
          fileInfo.uploadedToOSS = true;
        } else {
          console.error('OSS上传失败:', ossResult.error);
          fileInfo.ossError = ossResult.error;
        }
        
        return fileInfo;
      })
    );
    
    req.fileInfos = ossResults;
    next();
  } catch (error) {
    console.error('OSS上传中间件错误:', error);
    next(error);
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadRetouched,
  uploadImages,
  handleUploadError,
  getFileInfo,
  uploadToOSSMiddleware
};
