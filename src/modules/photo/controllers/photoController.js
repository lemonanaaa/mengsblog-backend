const Photo = require('../models/Photo');
const ShootSession = require('../models/ShootSession');
const Joi = require('joi');
const fs = require('fs').promises;
const path = require('path');
const { uploadToOSS, deleteFromOSS, batchDeleteFromOSS } = require('../../../config/oss');

// 验证模式
const photoSchema = Joi.object({
  title: Joi.string().min(1).max(100).required(),
  shootDate: Joi.date().required(),
  shootLocation: Joi.string().max(200).optional(),
  camera: Joi.string().optional(),
  lens: Joi.string().optional(),
  settings: Joi.object({
    aperture: Joi.string().optional(),
    shutterSpeed: Joi.string().optional(),
    iso: Joi.number().optional(),
    focalLength: Joi.string().optional()
  }).optional(),
  shootSession: Joi.string().hex().length(24).required(),
  tags: Joi.array().items(Joi.string()).optional(),
  description: Joi.string().max(500).optional(),
  status: Joi.string().valid('draft', 'published', 'archived').default('draft'),
  sortOrder: Joi.number().default(0),
  isFeatured: Joi.boolean().default(false)
});

const shootSessionSchema = Joi.object({
  // 必填字段（4个）
  date: Joi.date().required(),
  friendName: Joi.string().min(1).max(50).required(),
  friendFullName: Joi.string().min(1).max(100).required(),
  phoneTail: Joi.string().pattern(/^\d{4}$/).required().messages({
    'string.pattern.base': '手机尾号必须是4位数字'
  }),
  
  // 选填字段
  batchName: Joi.string().max(100).optional(),
  shootLocation: Joi.string().max(200).optional(),
  theme: Joi.string().max(100).optional(),
  description: Joi.string().max(1000).optional(),
  camera: Joi.string().optional(),
  lens: Joi.string().optional(),
  settings: Joi.object({
    aperture: Joi.string().optional(),
    shutterSpeed: Joi.string().optional(),
    iso: Joi.number().optional(),
    focalLength: Joi.string().optional()
  }).optional(),
  weather: Joi.string().optional(),
  lighting: Joi.string().optional(),

  tags: Joi.array().items(Joi.string()).optional(),
  isFeatured: Joi.boolean().default(false),
  sortOrder: Joi.number().default(0),
  isPublic: Joi.boolean().default(true).optional()
});

// 获取所有图片
const getAllPhotos = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      shootSession, 
      isRetouched, 
      featured,
      isMeng 
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    // 构建查询条件
    const query = {};
    
    // 根据isMeng参数控制返回的图片状态
    if (isMeng === 'true') {
      // isMeng为true时，返回所有图片
    } else {
      // isMeng为false或未提供时，只返回已发布的图片
      query.status = 'published';
    }
    
    // 其他筛选条件
    if (status) query.status = status;
    if (shootSession) query.shootSession = shootSession;
    if (isRetouched === 'true') query.isRetouched = true;
    if (isRetouched === 'false') query.isRetouched = false;
    if (featured === 'true') query.isFeatured = true;
    
    // 执行查询
    const photos = await Photo.find(query)
      .populate('shootSession', 'name theme shootDate')
      .sort([['shootDate', -1], ['sortOrder', 1], ['_id', -1]])
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // 获取总数
    const total = await Photo.countDocuments(query);
    
    res.json({
      success: true,
      data: photos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取图片列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取图片列表失败',
      error: error.message
    });
  }
};

// 根据拍摄批次获取图片
const getPhotosByShootSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { page = 1, limit = 50, isMeng } = req.query;
    
    const skip = (page - 1) * limit;
    
    // 验证拍摄批次是否存在
    const shootSession = await ShootSession.findById(sessionId);
    if (!shootSession) {
      return res.status(404).json({
        success: false,
        message: '拍摄批次不存在'
      });
    }
    
    // 构建查询条件
    const query = { shootSession: sessionId };
    
    // 根据isMeng参数控制返回的图片状态
    if (isMeng !== 'true') {
      query.status = 'published';
    }
    
    // 执行查询
    const photos = await Photo.find(query)
      .populate('shootSession', 'name theme shootDate')
      .sort([['sortOrder', 1], ['createdAt', -1]])
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // 获取总数
    const total = await Photo.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        shootSession,
        photos
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取拍摄批次图片失败:', error);
    res.status(500).json({
      success: false,
      message: '获取拍摄批次图片失败',
      error: error.message
    });
  }
};

// 获取精修图片
const getRetouchedPhotos = async (req, res) => {
  try {
    const { page = 1, limit = 20, isMeng } = req.query;
    
    const skip = (page - 1) * limit;
    
    // 构建查询条件
    const query = { isRetouched: true };
    
    // 根据isMeng参数控制返回的图片状态
    if (isMeng !== 'true') {
      query.status = 'published';
    }
    
    // 执行查询
    const photos = await Photo.find(query)
      .populate('shootSession', 'name theme shootDate')
      .sort([['retouchedAt', -1], ['_id', -1]])
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // 获取总数
    const total = await Photo.countDocuments(query);
    
    res.json({
      success: true,
      data: photos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取精修图片失败:', error);
    res.status(500).json({
      success: false,
      message: '获取精修图片失败',
      error: error.message
    });
  }
};

// 统一的图片上传方法（支持普通图片和精修图片）
const uploadImages = async (req, res) => {
  try {
    const { 
      shootSession, 
      shootDate, 
      shootLocation, 
      camera, 
      lens, 
      settings, 
      tags, 
      description,
      imageType = 'normal'  // 新增字段：normal(普通图片) 或 retouched(精修图片)
    } = req.body;
    
    if (!req.fileInfos || req.fileInfos.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有上传任何文件'
      });
    }
    
    // 验证拍摄批次是否存在
    if (shootSession) {
      const session = await ShootSession.findById(shootSession);
      if (!session) {
        return res.status(400).json({
          success: false,
          message: '指定的拍摄批次不存在'
        });
      }
    }
    
    const uploadedPhotos = [];
    const uploadedRetouched = [];
    
    // 处理每个上传的文件
    for (const fileInfo of req.fileInfos) {
      if (fileInfo.isRetouched || imageType === 'retouched') {
        // 处理精修图片
        const retouchedData = {
          filename: fileInfo.filename,
          originalName: fileInfo.originalName,
          filePath: fileInfo.filePath,
          fileSize: fileInfo.fileSize,
          mimeType: fileInfo.mimeType,
          isRetouched: true,
          retouchedVersion: fileInfo.filename,
          retouchedAt: new Date()
        };
        
        uploadedRetouched.push(retouchedData);
      } else {
        // 处理普通图片
        const photoData = {
          title: fileInfo.originalName.replace(/\.[^/.]+$/, ""), // 去掉文件扩展名作为标题
          filename: fileInfo.filename,
          originalName: fileInfo.originalName,
          filePath: fileInfo.filePath, // 保留本地路径作为备份
          fileSize: fileInfo.fileSize,
          mimeType: fileInfo.mimeType,
          shootDate: shootDate || new Date(),
          shootLocation: shootLocation || '',
          camera: camera || '',
          lens: lens || '',
          settings: settings ? JSON.parse(settings) : {},
          shootSession: shootSession,
          tags: tags ? JSON.parse(tags) : [],
          description: description || '',
          status: 'draft'
        };
        
        // 如果OSS上传成功，添加OSS信息
        if (fileInfo.uploadedToOSS) {
          photoData.ossKey = fileInfo.ossKey;
          photoData.ossUrl = fileInfo.ossUrl;
        }
        
        const photo = new Photo(photoData);
        await photo.save();
        
        uploadedPhotos.push(photo);
      }
    }
    
    // 更新拍摄批次的图片数量
    if (shootSession) {
      const session = await ShootSession.findById(shootSession);
      if (session) {
        await session.updatePhotoCounts();
      }
    }
    
    res.status(201).json({
      success: true,
      message: `成功上传 ${uploadedPhotos.length} 张普通图片，${uploadedRetouched.length} 张精修图片`,
      data: {
        photos: uploadedPhotos,
        retouched: uploadedRetouched,
        totalCount: uploadedPhotos.length + uploadedRetouched.length
      }
    });
  } catch (error) {
    console.error('图片上传失败:', error);
    res.status(500).json({
      success: false,
      message: '图片上传失败',
      error: error.message
    });
  }
};

// 创建拍摄批次
const createShootSession = async (req, res) => {
  try {
    const { error, value } = shootSessionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        error: error.details[0].message
      });
    }
    
    // 字段映射：将API字段名映射到数据库字段名
    const mappedData = {
      ...value,
      shootDate: value.date,           // date -> shootDate
      name: value.batchName            // batchName -> name
    };
    
    // 删除映射前的字段
    delete mappedData.date;
    delete mappedData.batchName;
    
    const shootSession = new ShootSession(mappedData);
    await shootSession.save();
    
    res.status(201).json({
      success: true,
      message: '拍摄批次创建成功',
      data: shootSession
    });
  } catch (error) {
    console.error('创建拍摄批次失败:', error);
    res.status(500).json({
      success: false,
      message: '创建拍摄批次失败',
      error: error.message
    });
  }
};

// 获取所有拍摄批次
const getAllShootSessions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      featured,
      isMeng,
      friendName,
      friendFullName,
      phoneTail,
      isPublic
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    // 构建查询条件
    const query = {};
    
    // 根据isMeng参数控制返回的批次
    if (isMeng === 'true') {
      // 返回所有批次
    } else {
      // 只返回公开的批次
      query.isPublic = true;
    }
    
    // 其他筛选条件
    if (featured === 'true') query.isFeatured = true;
    
    // 朋友信息筛选
    if (friendName) query.friendName = { $regex: friendName, $options: 'i' };
    if (friendFullName) query.friendFullName = { $regex: friendFullName, $options: 'i' };
    if (phoneTail) query.phoneTail = phoneTail;
    if (isPublic !== undefined) query.isPublic = isPublic === 'true';
    
    // 执行查询
    const shootSessions = await ShootSession.find(query)
      .sort([['shootDate', -1], ['sortOrder', 1]])
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // 字段映射：让前端字段名与后端一致
    const mappedSessions = shootSessions.map(session => ({
      // 排除重命名的字段，保留其他所有信息
      friendName: session.friendName,
      friendFullName: session.friendFullName,
      phoneTail: session.phoneTail,
      isPublic: session.isPublic,
      shootLocation: session.shootLocation,
      theme: session.theme,
      description: session.description,
      totalPhotos: session.totalPhotos,
      retouchedPhotos: session.retouchedPhotos,
      publishedPhotos: session.publishedPhotos,
      tags: session.tags,
      isFeatured: session.isFeatured,
      sortOrder: session.sortOrder,
      author: session.author,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      __v: session.__v,
      
      // 前端字段映射（重命名的字段）
      id: session._id,
      date: session.shootDate,
      batchName: session.name,
      location: session.shootLocation
    }));
    
    // 获取总数
    const total = await ShootSession.countDocuments(query);
    
    res.json({
      success: true,
      sessions: mappedSessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取拍摄批次列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取拍摄批次列表失败',
      error: error.message
    });
  }
};

// 根据ID获取拍摄批次
const getShootSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const shootSession = await ShootSession.findById(id);
    if (!shootSession) {
      return res.status(404).json({
        success: false,
        message: '拍摄批次不存在'
      });
    }
    
    // 字段映射：让前端字段名与后端一致
    const mappedSession = {
      // 排除重命名的字段，保留其他所有信息
      friendName: shootSession.friendName,
      friendFullName: shootSession.friendFullName,
      phoneTail: shootSession.phoneTail,
      isPublic: shootSession.isPublic,
      shootLocation: shootSession.shootLocation,
      theme: shootSession.theme,
      description: shootSession.description,
      totalPhotos: shootSession.totalPhotos,
      retouchedPhotos: shootSession.retouchedPhotos,
      publishedPhotos: shootSession.publishedPhotos,
      tags: shootSession.tags,
      isFeatured: shootSession.isFeatured,
      sortOrder: shootSession.sortOrder,
      author: shootSession.author,
      createdAt: shootSession.createdAt,
      updatedAt: shootSession.updatedAt,
      __v: shootSession.__v,
      
      // 前端字段映射（重命名的字段）
      id: shootSession._id,
      date: shootSession.shootDate,
      batchName: shootSession.name,
      location: shootSession.shootLocation
    };
    
    res.json({
      success: true,
      data: mappedSession
    });
  } catch (error) {
    console.error('获取拍摄批次详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取拍摄批次详情失败',
      error: error.message
    });
  }
};

// 更新拍摄批次
const updateShootSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = shootSessionSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        error: error.details[0].message
      });
    }
    
    // 字段映射：将API字段名映射到数据库字段名
    const mappedData = {
      ...value,
      shootDate: value.date,           // date -> shootDate
      name: value.batchName            // batchName -> name
    };
    
    // 删除映射前的字段
    delete mappedData.date;
    delete mappedData.batchName;
    
    const shootSession = await ShootSession.findById(id);
    if (!shootSession) {
      return res.status(404).json({
        success: false,
        message: '拍摄批次不存在'
      });
    }
    
    // 更新字段
    Object.assign(shootSession, mappedData);
    await shootSession.save();
    
    res.json({
      success: true,
      message: '拍摄批次更新成功',
      data: shootSession
    });
  } catch (error) {
    console.error('更新拍摄批次失败:', error);
    res.status(500).json({
      success: false,
      message: '更新拍摄批次失败',
      error: error.message
    });
  }
};

// 删除拍摄批次
const deleteShootSession = async (req, res) => {
  try {
    const { id } = req.params;
    
    const shootSession = await ShootSession.findById(id);
    if (!shootSession) {
      return res.status(404).json({
        success: false,
        message: '拍摄批次不存在'
      });
    }
    
    // 检查是否有关联的图片
    const photoCount = await Photo.countDocuments({ shootSession: id });
    if (photoCount > 0) {
      return res.status(400).json({
        success: false,
        message: `无法删除拍摄批次，还有 ${photoCount} 张图片关联`
      });
    }
    
    await ShootSession.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: '拍摄批次删除成功'
    });
  } catch (error) {
    console.error('删除拍摄批次失败:', error);
    res.status(500).json({
      success: false,
      message: '删除拍摄批次失败',
      error: error.message
    });
  }
};

// 标记图片为精修
const markPhotoAsRetouched = async (req, res) => {
  try {
    const { id } = req.params;
    const { retouchedVersion } = req.body;
    
    if (!retouchedVersion) {
      return res.status(400).json({
        success: false,
        message: '精修版本文件路径不能为空'
      });
    }
    
    const photo = await Photo.findById(id);
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      });
    }
    
    await photo.markAsRetouched(retouchedVersion);
    
    // 更新拍摄批次的精修图片数量
    if (photo.shootSession) {
      const shootSession = await ShootSession.findById(photo.shootSession);
      if (shootSession) {
        await shootSession.updatePhotoCounts();
      }
    }
    
    res.json({
      success: true,
      message: '图片已标记为精修',
      data: photo
    });
  } catch (error) {
    console.error('标记图片精修失败:', error);
    res.status(500).json({
      success: false,
      message: '标记图片精修失败',
      error: error.message
    });
  }
};

// 获取图片详情
const getPhotoById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const photo = await Photo.findById(id)
      .populate('shootSession', 'name theme shootDate description');
    
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      });
    }
    
    // 增加浏览次数
    await photo.incrementViewCount();
    
    res.json({
      success: true,
      data: photo
    });
  } catch (error) {
    console.error('获取图片详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取图片详情失败',
      error: error.message
    });
  }
};

// 更新图片信息
const updatePhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = photoSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        error: error.details[0].message
      });
    }
    
    const photo = await Photo.findById(id);
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      });
    }
    
    Object.assign(photo, value);
    await photo.save();
    
    const updatedPhoto = await Photo.findById(id)
      .populate('shootSession', 'name theme shootDate');
    
    res.json({
      success: true,
      message: '图片更新成功',
      data: updatedPhoto
    });
  } catch (error) {
    console.error('更新图片失败:', error);
    res.status(500).json({
      success: false,
      message: '更新图片失败',
      error: error.message
    });
  }
};

// 删除单张图片
const deletePhoto = async (req, res) => {
  try {
    const { id } = req.params;
    
    const photo = await Photo.findById(id);
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      });
    }
    
    // 删除文件
    try {
      if (photo.filePath) {
        await fs.unlink(photo.filePath);
      }
      if (photo.retouchedVersion) {
        const retouchedPath = path.join(process.env.UPLOAD_PATH || './uploads', 'retouched', photo.retouchedVersion);
        await fs.unlink(retouchedPath);
      }
    } catch (fileError) {
      console.warn('删除文件失败:', fileError);
    }
    
    await Photo.findByIdAndDelete(id);
    
    // 更新拍摄批次的图片数量
    if (photo.shootSession) {
      const shootSession = await ShootSession.findById(photo.shootSession);
      if (shootSession) {
        await shootSession.updatePhotoCounts();
      }
    }
    
    res.json({
      success: true,
      message: '图片删除成功'
    });
  } catch (error) {
    console.error('删除图片失败:', error);
    res.status(500).json({
      success: false,
      message: '删除图片失败',
      error: error.message
    });
  }
};

// 批量删除图片
const deletePhotos = async (req, res) => {
  try {
    const { photoIds } = req.body;
    
    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的图片ID数组'
      });
    }
    
    // 查找要删除的图片
    const photos = await Photo.find({ _id: { $in: photoIds } });
    
    if (photos.length === 0) {
      return res.status(404).json({
        success: false,
        message: '没有找到要删除的图片'
      });
    }
    
    const deletedPhotos = [];
    const failedDeletions = [];
    
    // 逐个删除图片
    for (const photo of photos) {
      try {
        // 删除文件
        try {
          if (photo.filePath) {
            await fs.unlink(photo.filePath);
          }
          if (photo.retouchedVersion) {
            const retouchedPath = path.join(process.env.UPLOAD_PATH || './uploads', 'retouched', photo.retouchedVersion);
            await fs.unlink(retouchedPath);
          }
        } catch (fileError) {
          console.warn(`删除文件失败 ${photo._id}:`, fileError);
        }
        
        // 删除数据库记录
        await Photo.findByIdAndDelete(photo._id);
        deletedPhotos.push(photo._id);
        
        // 更新拍摄批次的图片数量
        if (photo.shootSession) {
          const shootSession = await ShootSession.findById(photo.shootSession);
          if (shootSession) {
            await shootSession.updatePhotoCounts();
          }
        }
      } catch (error) {
        console.error(`删除图片 ${photo._id} 失败:`, error);
        failedDeletions.push({
          id: photo._id,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `成功删除 ${deletedPhotos.length} 张图片`,
      data: {
        deletedCount: deletedPhotos.length,
        failedCount: failedDeletions.length,
        deletedIds: deletedPhotos,
        failedDeletions: failedDeletions
      }
    });
  } catch (error) {
    console.error('批量删除图片失败:', error);
    res.status(500).json({
      success: false,
      message: '批量删除图片失败',
      error: error.message
    });
  }
};

// 获取批次概览（每个批次包含一张代表性照片和统计信息）
const getShootSessionsOverview = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      featured,
      isMeng,
      friendName,
      friendFullName,
      phoneTail,
      isPublic
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    // 构建查询条件
    const query = {};
    
    // 根据isMeng参数控制返回的批次
    if (isMeng === 'true') {
      // 返回所有批次
    } else {
      // 只返回公开的批次
      query.isPublic = true;
    }
    
    // 其他筛选条件
    if (featured === 'true') query.isFeatured = true;
    
    // 朋友信息筛选
    if (friendName) query.friendName = { $regex: friendName, $options: 'i' };
    if (friendFullName) query.friendFullName = { $regex: friendFullName, $options: 'i' };
    if (phoneTail) query.phoneTail = phoneTail;
    if (isPublic !== undefined) query.isPublic = isPublic === 'true';
    
    // 执行查询
    const shootSessions = await ShootSession.find(query)
      .sort([['shootDate', -1], ['sortOrder', 1]])
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // 为每个批次添加代表性照片和统计信息
    const sessionsWithPhotos = await Promise.all(
      shootSessions.map(async (session) => {
        // 获取该批次的一张代表性照片（优先选择精选或精修的）
        const representativePhoto = await Photo.findOne({ 
          shootSession: session._id 
        })
        .sort({ 
          isFeatured: -1,    // 精选图片优先
          isRetouched: -1,   // 精修图片其次
          createdAt: -1      // 最后按创建时间
        })
        .select('filename title shootDate isRetouched isFeatured')
        .lean();
        
        // 获取该批次的统计信息
        const photoStats = await Photo.aggregate([
          { $match: { shootSession: session._id } },
          {
            $group: {
              _id: null,
              totalPhotos: { $sum: 1 },
              publishedPhotos: { 
                $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } 
              },
              retouchedPhotos: { 
                $sum: { $cond: [{ $eq: ['$isRetouched', true] }, 1, 0] } 
              },
              featuredPhotos: { 
                $sum: { $cond: [{ $eq: ['$isFeatured', true] }, 1, 0] } 
              }
            }
          }
        ]);
        
        const stats = photoStats[0] || {
          totalPhotos: 0,
          publishedPhotos: 0,
          retouchedPhotos: 0,
          featuredPhotos: 0
        };
        
        return {
          // 排除重命名的字段，保留其他所有信息
          friendName: session.friendName,
          friendFullName: session.friendFullName,
          phoneTail: session.phoneTail,
          isPublic: session.isPublic,
          shootLocation: session.shootLocation,
          theme: session.theme,
          description: session.description,
          totalPhotos: session.totalPhotos,
          retouchedPhotos: session.retouchedPhotos,
          publishedPhotos: session.publishedPhotos,
          tags: session.tags,
          isFeatured: session.isFeatured,
          sortOrder: session.sortOrder,
          author: session.author,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          __v: session.__v,
          
          // 前端字段映射（重命名的字段）
          id: session._id,
          date: session.shootDate,
          batchName: session.name,
          location: session.shootLocation,
          
          // 添加照片信息
          photos: [],
          
          representativePhoto: representativePhoto ? {
            filename: representativePhoto.filename,
            title: representativePhoto.title,
            shootDate: representativePhoto.shootDate,
            isRetouched: representativePhoto.isRetouched,
            isFeatured: representativePhoto.isFeatured,
            imageUrl: `/uploads/photos/${representativePhoto.filename}`
          } : null,
          photoStats: stats
        };
      })
    );
    
    // 获取总数
    const total = await ShootSession.countDocuments(query);
    
    res.json({
      success: true,
      sessions: sessionsWithPhotos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取批次概览失败:', error);
    res.status(500).json({
      success: false,
      message: '获取批次概览失败',
      error: error.message
    });
  }
};

module.exports = {
  // 图片相关
  getAllPhotos,
  getPhotoById,
  updatePhoto,
  deletePhoto,
  deletePhotos,
  getPhotosByShootSession,
  getRetouchedPhotos,
  markPhotoAsRetouched,
  uploadImages,
  
  // 拍摄批次相关
  createShootSession,
  getAllShootSessions,
  getShootSessionsOverview,
  getShootSessionById,
  updateShootSession,
  deleteShootSession
};
