// 共享常量定义

// 图片相关常量
const IMAGE_TYPES = {
  NORMAL: 'normal',
  RETOUCHED: 'retouched'
};

const IMAGE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived'
};

// 博客相关常量
const BLOG_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived'
};

// 拍摄批次状态
const SHOOT_SESSION_STATUS = {
  PLANNING: 'planning',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
};

// 文件上传限制
const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES: 100,
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
    'image/bmp'
  ]
};

module.exports = {
  IMAGE_TYPES,
  IMAGE_STATUS,
  BLOG_STATUS,
  SHOOT_SESSION_STATUS,
  UPLOAD_LIMITS
};
