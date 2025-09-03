const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  // 基本信息
  title: {
    type: String,
    required: [true, "图片标题不能为空"],
    trim: true,
    maxlength: [100, "标题不能超过100个字符"]
  },
  
  // 图片文件信息
  filename: {
    type: String,
    required: [true, "文件名不能为空"]
  },
  
  originalName: {
    type: String,
    required: [true, "原始文件名不能为空"]
  },
  
  // 本地文件路径（兼容旧数据）
  filePath: {
    type: String,
    required: false
  },
  
  // OSS云存储信息
  ossKey: {
    type: String,  // OSS中的文件key
    required: false
  },
  
  ossUrl: {
    type: String,  // OSS访问URL
    required: false
  },
  
  fileSize: {
    type: Number,
    required: [true, "文件大小不能为空"]
  },
  
  mimeType: {
    type: String,
    required: [true, "文件类型不能为空"]
  },
  
  // 图片元数据
  width: {
    type: Number
  },
  
  height: {
    type: Number
  },
  
  // 拍摄信息
  shootDate: {
    type: Date,
    required: [true, "拍摄日期不能为空"]
  },
  
  shootLocation: {
    type: String,
    trim: true,
    maxlength: [200, "拍摄地点不能超过200个字符"]
  },
  
  camera: {
    type: String,
    trim: true
  },
  
  lens: {
    type: String,
    trim: true
  },
  
  settings: {
    aperture: String,    // 光圈
    shutterSpeed: String, // 快门速度
    iso: Number,         // ISO
    focalLength: String  // 焦距
  },
  
  // 拍摄批次管理
  shootSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShootSession',
    required: [true, "拍摄批次不能为空"]
  },
  
  // 精修状态
  isRetouched: {
    type: Boolean,
    default: false
  },
  
  retouchedVersion: {
    type: String,  // 精修版本的文件路径
    default: null
  },
  
  retouchedAt: {
    type: Date,
    default: null
  },
  
  // 标签和描述
  tags: [{
    type: String,
    trim: true
  }],
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, "描述不能超过500个字符"]
  },
  
  // 状态管理
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  
  // 排序和精选
  sortOrder: {
    type: Number,
    default: 0
  },
  
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // 访问统计
  viewCount: {
    type: Number,
    default: 0
  },
  
  downloadCount: {
    type: Number,
    default: 0
  },
  
  // 作者信息
  author: {
    type: String,
    default: 'Meng'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
photoSchema.index({ shootSession: 1 });
photoSchema.index({ shootDate: -1 });
photoSchema.index({ isRetouched: 1 });
photoSchema.index({ status: 1 });
photoSchema.index({ tags: 1 });
photoSchema.index({ 'settings.iso': 1 });

// 虚拟字段
photoSchema.virtual('url').get(function() {
  return `/photos/${this._id}`;
});

photoSchema.virtual('imageUrl').get(function() {
  return `/uploads/photos/${this.filename}`;
});

photoSchema.virtual('retouchedUrl').get(function() {
  if (this.isRetouched && this.retouchedVersion) {
    return `/uploads/retouched/${this.retouchedVersion}`;
  }
  return null;
});

// 静态方法
photoSchema.statics.findByShootSession = function(sessionId) {
  return this.find({ shootSession: sessionId }).sort({ sortOrder: 1, createdAt: -1 });
};

photoSchema.statics.findRetouched = function() {
  return this.find({ isRetouched: true }).sort({ retouchedAt: -1 });
};

photoSchema.statics.findPublished = function() {
  return this.find({ status: 'published' }).sort({ shootDate: -1 });
};

// 实例方法
photoSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

photoSchema.methods.incrementDownloadCount = function() {
  this.downloadCount += 1;
  return this.save();
};

photoSchema.methods.markAsRetouched = function(retouchedVersion) {
  this.isRetouched = true;
  this.retouchedVersion = retouchedVersion;
  this.retouchedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Photo', photoSchema);
