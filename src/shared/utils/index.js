// 共享工具函数

// 分页工具
const createPagination = (page, limit, total) => {
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    pages: Math.ceil(total / limit)
  };
};

// 响应工具
const createResponse = (success, message, data = null, pagination = null) => {
  const response = {
    success,
    message
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  if (pagination !== null) {
    response.pagination = pagination;
  }
  
  return response;
};

// 成功响应
const successResponse = (message, data = null, pagination = null) => {
  return createResponse(true, message, data, pagination);
};

// 错误响应
const errorResponse = (message, error = null) => {
  return createResponse(false, message, error ? { error } : null);
};

// 文件大小格式化
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 生成唯一文件名
const generateUniqueFilename = (originalName, prefix = '') => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const ext = originalName.substring(originalName.lastIndexOf('.'));
  return `${prefix}${timestamp}-${random}${ext}`;
};

// 验证ObjectId
const isValidObjectId = (id) => {
  const mongoose = require('mongoose');
  return mongoose.Types.ObjectId.isValid(id);
};

module.exports = {
  createPagination,
  createResponse,
  successResponse,
  errorResponse,
  formatFileSize,
  generateUniqueFilename,
  isValidObjectId
};
