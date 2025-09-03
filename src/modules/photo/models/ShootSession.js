const mongoose = require('mongoose');

const shootSessionSchema = new mongoose.Schema({
  // 批次基本信息
  name: {
    type: String,
    required: false, // 改为选填，会自动生成
    trim: true,
    maxlength: [100, "名称不能超过100个字符"]
  },
  
  // 拍摄信息
  shootDate: {
    type: Date,
    required: [true, "拍摄日期不能为空"]
  },
  
  shootLocation: {
    type: String,
    trim: true,
    maxlength: [200, "拍摄地点不能超过200个字符"],
    required: false // 选填
  },
  
  // 朋友信息（必填）
  friendName: {
    type: String,
    required: [true, "朋友姓名不能为空"],
    trim: true,
    maxlength: [50, "朋友姓名不能超过50个字符"]
  },
  
  friendFullName: {
    type: String,
    required: [true, "朋友姓名全拼不能为空"],
    trim: true,
    maxlength: [100, "朋友姓名全拼不能超过100个字符"]
  },
  
  phoneTail: {
    type: String,
    required: [true, "手机尾号不能为空"],
    trim: true,
    maxlength: [4, "手机尾号不能超过4位"],
    validate: {
      validator: function(v) {
        return /^\d{4}$/.test(v);
      },
      message: '手机尾号必须是4位数字'
    }
  },
  
  isPublic: {
    type: Boolean,
    default: true,
    required: false // 选填，默认true
  },
  
  // 拍摄主题和描述（选填）
  theme: {
    type: String,
    trim: true,
    maxlength: [100, "拍摄主题不能超过100个字符"],
    required: false
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [100, "描述不能超过100个字符"],
    required: false // 选填
  },
  
  // 拍摄设备信息
  camera: {
    type: String,
    trim: true
  },
  
  lens: {
    type: String,
    trim: true
  },
  
  // 拍摄参数
  settings: {
    aperture: String,    // 光圈
    shutterSpeed: String, // 快门速度
    iso: Number,         // ISO
    focalLength: String  // 焦距
  },
  
  // 天气和光线条件
  weather: {
    type: String,
    trim: true
  },
  
  lighting: {
    type: String,
    trim: true
  },
  

  
  // 统计信息
  totalPhotos: {
    type: Number,
    default: 0
  },
  
  retouchedPhotos: {
    type: Number,
    default: 0
  },
  
  publishedPhotos: {
    type: Number,
    default: 0
  },
  
  // 标签
  tags: [{
    type: String,
    trim: true
  }],
  
  // 精选状态
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // 排序
  sortOrder: {
    type: Number,
    default: 0
  },
  
  // 作者
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
shootSessionSchema.index({ shootDate: -1 });
shootSessionSchema.index({ isFeatured: 1 });
shootSessionSchema.index({ tags: 1 });

// 自动生成批次名称
shootSessionSchema.pre('save', function(next) {
  // 如果没有提供名称，自动生成：日期+朋友姓名
  if (!this.name) {
    const date = this.shootDate.toISOString().split('T')[0]; // 格式：2024-03-15
    this.name = `${date}-${this.friendName}`;
  }
  next();
});

// 虚拟字段
shootSessionSchema.virtual('url').get(function() {
  return `/shoot-sessions/${this._id}`;
});

shootSessionSchema.virtual('photos', {
  ref: 'Photo',
  localField: '_id',
  foreignField: 'shootSession'
});

// 静态方法
shootSessionSchema.statics.findActive = function() {
  return this.find().sort({ shootDate: -1 });
};

shootSessionSchema.statics.findFeatured = function() {
  return this.find({ isFeatured: true }).sort({ shootDate: -1 });
};

// 实例方法
shootSessionSchema.methods.updatePhotoCounts = async function() {
  const Photo = mongoose.model('Photo');
  
  this.totalPhotos = await Photo.countDocuments({ shootSession: this._id });
  this.retouchedPhotos = await Photo.countDocuments({ 
    shootSession: this._id, 
    isRetouched: true 
  });
  this.publishedPhotos = await Photo.countDocuments({ 
    shootSession: this._id, 
    status: 'published' 
  });
  
  return this.save();
};

module.exports = mongoose.model('ShootSession', shootSessionSchema);
