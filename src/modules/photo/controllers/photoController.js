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
  location: Joi.string().max(200).optional(),  // 支持前端字段名
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
    
    // 不再需要状态筛选，返回所有图片
    
    // 其他筛选条件
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
    
    // 支持GET和POST两种请求方式
    // GET请求从query获取参数，POST请求从body获取参数
    const params = req.method === 'POST' ? req.body : req.query;
    
    const { 
      page = 1, 
      limit = 50, 
      isMeng,
      types = 'all'  // 新增参数：'all' 或 'retouched' 或数组 ['all', 'retouched']
    } = params;
    
    const skip = (page - 1) * limit;
    
    // 验证拍摄批次是否存在
    const shootSession = await ShootSession.findById(sessionId);
    if (!shootSession) {
      return res.status(404).json({
        success: false,
        message: '拍摄批次不存在'
      });
    }
    
    // 处理types参数
    let typesArray = [];
    if (typeof types === 'string') {
      typesArray = [types];
    } else if (Array.isArray(types)) {
      typesArray = types;
    } else {
      typesArray = ['all'];
    }
    
    // 验证types参数
    const validTypes = ['all', 'retouched'];
    const invalidTypes = typesArray.filter(type => !validTypes.includes(type));
    if (invalidTypes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `无效的类型参数: ${invalidTypes.join(', ')}。支持的类型: ${validTypes.join(', ')}`
      });
    }
    
    // 构建基础查询条件
    const baseQuery = { shootSession: sessionId };
    
    // 根据types参数构建不同的查询
    let allPhotos = [];
    let retouchedPhotos = [];
    
    // 如果需要返回所有图片
    if (typesArray.includes('all')) {
      allPhotos = await Photo.find(baseQuery)
        .populate('shootSession', 'name theme shootDate')
        .sort([['sortOrder', 1], ['createdAt', -1]])
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
    }
    
    // 如果需要返回精修图片
    if (typesArray.includes('retouched')) {
      const retouchedQuery = { ...baseQuery, isRetouched: true };
      retouchedPhotos = await Photo.find(retouchedQuery)
        .populate('shootSession', 'name theme shootDate')
        .sort([['retouchedAt', -1], ['sortOrder', 1], ['createdAt', -1]])
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
    }
    
    // 获取统计信息
    const totalAll = await Photo.countDocuments(baseQuery);
    const totalRetouched = await Photo.countDocuments({ ...baseQuery, isRetouched: true });
    
    // 构建返回数据
    const responseData = {
      shootSession: {
        id: shootSession._id,
        name: shootSession.name,
        theme: shootSession.theme,
        shootDate: shootSession.shootDate,
        friendName: shootSession.friendName,
        friendFullName: shootSession.friendFullName,
        phoneTail: shootSession.phoneTail,
        shootLocation: shootSession.shootLocation || '',  // 数据库字段名
        location: shootSession.shootLocation || '',       // 前端期望的字段名
        description: shootSession.description,
        totalPhotos: shootSession.totalPhotos,
        retouchedPhotos: shootSession.retouchedPhotos,
        publishedPhotos: shootSession.publishedPhotos,
        isPublic: shootSession.isPublic,
        tags: shootSession.tags,
        isFeatured: shootSession.isFeatured,
        sortOrder: shootSession.sortOrder,
        author: shootSession.author,
        createdAt: shootSession.createdAt,
        updatedAt: shootSession.updatedAt
      }
    };
    
    // 根据请求的类型添加相应的数据
    if (typesArray.includes('all')) {
      responseData.photos = allPhotos;
      responseData.pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalAll,
        pages: Math.ceil(totalAll / limit)
      };
    }
    
    if (typesArray.includes('retouched')) {
      responseData.retouchedPhotos = retouchedPhotos;
      if (!responseData.pagination) {
        responseData.pagination = {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalRetouched,
          pages: Math.ceil(totalRetouched / limit)
        };
      }
    }
    
    // 如果同时请求了两种类型，添加统计信息
    if (typesArray.length > 1) {
      responseData.stats = {
        totalPhotos: totalAll,
        retouchedPhotos: totalRetouched,
        normalPhotos: totalAll - totalRetouched
      };
    }
    
    res.json({
      success: true,
      data: responseData
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
    
    // 不再需要状态筛选，返回所有图片
    
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
          title: fileInfo.originalName.replace(/\.[^/.]+$/, ""), // 去掉文件扩展名作为标题
          filename: fileInfo.filename,
          originalName: fileInfo.originalName,
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
          isRetouched: true,
          retouchedVersion: fileInfo.filename,
          retouchedAt: new Date()
        };
        
        // 如果OSS上传成功，添加OSS信息
        if (fileInfo.uploadedToOSS) {
          retouchedData.ossKey = fileInfo.ossKey;
          retouchedData.frontendUrl = fileInfo.frontendUrl; // 前端访问URL
          retouchedData.thumbnailUrl = fileInfo.thumbnailUrl; // 缩略图URL
          console.log(`✅ 精修图片保存成功，OSS信息已添加: ${fileInfo.originalName}`);
        } else {
          console.log(`⚠️ 精修图片保存成功，但OSS信息缺失: ${fileInfo.originalName}`);
          if (fileInfo.ossError) {
            console.error(`OSS错误详情: ${fileInfo.ossError}`);
          }
        }
        
        // 添加图片尺寸信息
        if (fileInfo.width && fileInfo.height) {
          retouchedData.width = fileInfo.width;
          retouchedData.height = fileInfo.height;
          retouchedData.aspectRatio = fileInfo.aspectRatio;
        }
        
        // 创建Photo记录并保存到数据库
        const retouchedPhoto = new Photo(retouchedData);
        await retouchedPhoto.save();
        
        uploadedRetouched.push(retouchedPhoto);
      } else {
        // 处理普通图片
        const photoData = {
          title: fileInfo.originalName.replace(/\.[^/.]+$/, ""), // 去掉文件扩展名作为标题
          filename: fileInfo.filename,
          originalName: fileInfo.originalName,
          fileSize: fileInfo.fileSize,
          mimeType: fileInfo.mimeType,
          shootDate: shootDate || new Date(),
          shootLocation: shootLocation || '',
          camera: camera || '',
          lens: lens || '',
          settings: settings ? JSON.parse(settings) : {},
          shootSession: shootSession,
          tags: tags ? JSON.parse(tags) : [],
          description: description || ''
        };
        
        // 如果OSS上传成功，添加OSS信息
        if (fileInfo.uploadedToOSS) {
          photoData.ossKey = fileInfo.ossKey;
          photoData.frontendUrl = fileInfo.frontendUrl; // 前端访问URL
          photoData.thumbnailUrl = fileInfo.thumbnailUrl; // 缩略图URL
          console.log(`✅ 图片保存成功，OSS信息已添加: ${fileInfo.originalName}`);
        } else {
          console.log(`⚠️ 图片保存成功，但OSS信息缺失: ${fileInfo.originalName}`);
          if (fileInfo.ossError) {
            console.error(`OSS错误详情: ${fileInfo.ossError}`);
          }
        }
        
        // 添加图片尺寸信息
        if (fileInfo.width && fileInfo.height) {
          photoData.width = fileInfo.width;
          photoData.height = fileInfo.height;
          photoData.aspectRatio = fileInfo.aspectRatio;
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
      name: value.batchName,           // batchName -> name
      shootLocation: value.location || value.shootLocation  // location -> shootLocation
    };
    
    // 删除映射前的字段
    delete mappedData.date;
    delete mappedData.batchName;
    delete mappedData.location;
    
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
      name: value.batchName,           // batchName -> name
      shootLocation: value.location || value.shootLocation  // location -> shootLocation
    };
    
    // 删除映射前的字段
    delete mappedData.date;
    delete mappedData.batchName;
    delete mappedData.location;
    
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
    
    // 验证请求参数
    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的图片ID数组',
        example: {
          photoIds: ['68b8410984d1475313b14ad9', '68b8410984d1475313b14ad7']
        }
      });
    }
    
    
    // 记录删除日志
    console.log(`🗑️ 批量删除图片请求:`, {
      photoIds,
      count: photoIds.length,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });
    
    // 查找要删除的图片
    const photos = await Photo.find({ _id: { $in: photoIds } });
    
    if (photos.length === 0) {
      return res.status(404).json({
        success: false,
        message: '没有找到要删除的图片',
        requestedIds: photoIds
      });
    }
    
    const deletedPhotos = [];
    const failedDeletions = [];
    const shootSessionsToUpdate = new Set();
    
    // 逐个删除图片
    for (const photo of photos) {
      try {
        console.log(`🔄 正在删除图片: ${photo.title} (${photo._id})`);
        
        // 删除本地文件
        try {
          if (photo.filePath) {
            await fs.unlink(photo.filePath);
            console.log(`✅ 本地文件删除成功: ${photo.filePath}`);
          }
          if (photo.retouchedVersion) {
            const retouchedPath = path.join(process.env.UPLOAD_PATH || './uploads', 'retouched', photo.retouchedVersion);
            await fs.unlink(retouchedPath);
            console.log(`✅ 精修文件删除成功: ${retouchedPath}`);
          }
        } catch (fileError) {
          console.warn(`⚠️ 删除文件失败 ${photo._id}:`, fileError.message);
        }
        
        // 删除OSS文件
        try {
          if (photo.ossKey) {
            await deleteFromOSS(photo.ossKey);
            console.log(`✅ OSS文件删除成功: ${photo.ossKey}`);
          }
        } catch (ossError) {
          console.warn(`⚠️ 删除OSS文件失败 ${photo._id}:`, ossError.message);
        }
        
        // 删除数据库记录
        await Photo.findByIdAndDelete(photo._id);
        
        deletedPhotos.push({
          id: photo._id,
          title: photo.title,
          filename: photo.filename,
          originalName: photo.originalName
        });
        
        // 收集需要更新的拍摄批次
        if (photo.shootSession) {
          shootSessionsToUpdate.add(photo.shootSession.toString());
        }
        
        console.log(`✅ 图片删除成功: ${photo.title}`);
        
      } catch (error) {
        console.error(`❌ 删除图片 ${photo._id} 失败:`, error);
        failedDeletions.push({
          id: photo._id,
          title: photo.title || '未知',
          error: error.message
        });
      }
    }
    
    // 批量更新拍摄批次的图片数量
    for (const sessionId of shootSessionsToUpdate) {
      try {
        const shootSession = await ShootSession.findById(sessionId);
        if (shootSession) {
          await shootSession.updatePhotoCounts();
          console.log(`✅ 拍摄批次统计更新成功: ${sessionId}`);
        }
      } catch (error) {
        console.warn(`⚠️ 更新拍摄批次统计失败 ${sessionId}:`, error.message);
      }
    }
    
    // 返回详细结果
    const result = {
      success: true,
      message: `批量删除完成：成功 ${deletedPhotos.length} 张，失败 ${failedDeletions.length} 张`,
      data: {
        summary: {
          totalRequested: photoIds.length,
          totalFound: photos.length,
          deletedCount: deletedPhotos.length,
          failedCount: failedDeletions.length,
          successRate: `${Math.round((deletedPhotos.length / photos.length) * 100)}%`
        },
        deletedPhotos: deletedPhotos,
        failedDeletions: failedDeletions,
        updatedSessions: Array.from(shootSessionsToUpdate)
      }
    };
    
    console.log(`📊 批量删除结果:`, result.data.summary);
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ 批量删除图片失败:', error);
    res.status(500).json({
      success: false,
      message: '批量删除图片失败',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
      isPublic,
      retouchedOnly = false  // 新增参数：是否只返回精修照片
    } = req.query;
    
    // 调试日志：检查参数
    console.log('🔍 Overview接口参数:', {
      retouchedOnly,
      retouchedOnlyType: typeof retouchedOnly,
      retouchedOnlyValue: retouchedOnly,
      allQueryParams: req.query
    });
    
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
    let shootSessions = await ShootSession.find(query)
      .sort([['shootDate', -1], ['sortOrder', 1]])
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // 如果只返回精修照片，过滤掉没有精修图片的批次
    if (retouchedOnly === 'true') {
      const sessionsWithRetouched = [];
      
      for (const session of shootSessions) {
        // 检查该批次是否有精修照片
        const retouchedCount = await Photo.countDocuments({ 
          shootSession: session._id, 
          isRetouched: true 
        });
        
        if (retouchedCount > 0) {
          sessionsWithRetouched.push(session);
        }
      }
      
      shootSessions = sessionsWithRetouched;
    }
    
    // 为每个批次添加代表性照片和统计信息
    const sessionsWithPhotos = await Promise.all(
      shootSessions.map(async (session) => {
        let representativePhoto = null;
        let retouchedPhoto = null;
        let photos = [];
        
        if (retouchedOnly === 'true') {
          // 如果只返回精修照片，获取前8张精修照片
          const retouchedPhotos = await Photo.find({ 
            shootSession: session._id,
            isRetouched: true
          })
          .sort({ 
            isFeatured: -1,    // 精选的精修图片优先
            retouchedAt: -1,   // 按精修时间倒序
            createdAt: -1      // 最后按创建时间
          })
          .limit(8)  // 限制为前8张
          .select('filename title shootDate isRetouched isFeatured frontendUrl thumbnailUrl ossKey retouchedAt')
          .lean();
          
          // 调试日志
          console.log(`🔍 批次 ${session._id} 精修照片查询结果:`, {
            sessionId: session._id,
            batchName: session.name,
            foundCount: retouchedPhotos.length,
            photos: retouchedPhotos.map(p => ({
              id: p._id,
              title: p.title,
              isRetouched: p.isRetouched,
              isFeatured: p.isFeatured,
              retouchedAt: p.retouchedAt
            }))
          });
          
          // 将前8张精修照片作为retouchedPhoto数组
          retouchedPhoto = retouchedPhotos;
          
          // 如果有精修照片，第一张作为代表性照片
          if (retouchedPhotos.length > 0) {
            representativePhoto = retouchedPhotos[0];
          }
        } else {
          // 原有逻辑：获取该批次的一张代表性照片（优先选择精选或精修的）
          representativePhoto = await Photo.findOne({ 
            shootSession: session._id 
          })
          .sort({ 
            isFeatured: -1,    // 精选图片优先
            isRetouched: -1,   // 精修图片其次
            createdAt: -1      // 最后按创建时间
          })
          .select('filename title shootDate isRetouched isFeatured frontendUrl thumbnailUrl ossKey')
          .lean();
          
          // 获取该批次的一张精修图片（优先选择精选的精修图片）
          const singleRetouchedPhoto = await Photo.findOne({ 
            shootSession: session._id,
            isRetouched: true  // 只选择精修图片
          })
          .sort({ 
            isFeatured: -1,    // 精选的精修图片优先
            retouchedAt: -1,   // 按精修时间倒序
            createdAt: -1      // 最后按创建时间
          })
          .select('filename title shootDate isRetouched isFeatured frontendUrl thumbnailUrl ossKey retouchedAt')
          .lean();
          
          // 将单张精修照片包装成数组，保持数据结构一致
          retouchedPhoto = singleRetouchedPhoto ? [singleRetouchedPhoto] : [];
        }
        
        // 获取该批次的统计信息
        const photoStats = await Photo.aggregate([
          { $match: { shootSession: session._id } },
          {
            $group: {
              _id: null,
              totalPhotos: { $sum: 1 },
              publishedPhotos: { 
                $sum: 1  // 所有图片都算作已发布
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
          
          // 添加照片信息（普通照片）
          photos: [],
          
          representativePhoto: representativePhoto ? {
            filename: representativePhoto.filename,
            title: representativePhoto.title,
            shootDate: representativePhoto.shootDate,
            isRetouched: representativePhoto.isRetouched,
            isFeatured: representativePhoto.isFeatured,
            // 使用OSS URL（正常情况下应该都有OSS URL）
            imageUrl: representativePhoto.frontendUrl || representativePhoto.thumbnailUrl,
            // 缩略图URL
            thumbnailUrl: representativePhoto.thumbnailUrl || representativePhoto.frontendUrl
          } : null,
          
          // 添加精修图片字段（始终为数组格式）
          retouchedPhoto: retouchedPhoto && retouchedPhoto.length > 0 ? retouchedPhoto.map(photo => ({
            filename: photo.filename,
            title: photo.title,
            shootDate: photo.shootDate,
            isRetouched: photo.isRetouched,
            isFeatured: photo.isFeatured,
            retouchedAt: photo.retouchedAt,
            imageUrl: photo.frontendUrl || photo.thumbnailUrl,
            thumbnailUrl: photo.thumbnailUrl || photo.frontendUrl
          })) : [],
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
