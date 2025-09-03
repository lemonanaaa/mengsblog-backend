const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const { 
  uploadImages,
  handleUploadError,
  getFileInfo,
  uploadToOSSMiddleware
} = require('../middleware/uploadMiddleware');

// 图片管理路由
router.get('/photos', photoController.getAllPhotos);
router.get('/photos/retouched', photoController.getRetouchedPhotos);
router.get('/photos/:id', photoController.getPhotoById);
router.put('/photos/:id', photoController.updatePhoto);
router.delete('/photos/:id', photoController.deletePhoto);

// 拍摄批次管理路由
router.get('/shoot-sessions/overview', photoController.getShootSessionsOverview);  // 具体路径放在前面
router.get('/shoot-sessions', photoController.getAllShootSessions);
router.get('/shoot-sessions/:id', photoController.getShootSessionById);
router.post('/shoot-sessions', photoController.createShootSession);
router.put('/shoot-sessions/:id', photoController.updateShootSession);
router.delete('/shoot-sessions/:id', photoController.deleteShootSession);

// 按拍摄批次获取图片
router.get('/shoot-sessions/:sessionId/photos', photoController.getPhotosByShootSession);

// 统一的图片上传路由（支持普通图片和精修图片）
router.post('/photos/upload', 
  uploadImages, 
  handleUploadError, 
  getFileInfo,
  uploadToOSSMiddleware,  // 添加OSS上传中间件
  photoController.uploadImages
);

// 批量删除图片
router.delete('/photos', photoController.deletePhotos);

module.exports = router;
