const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '标签名称不能为空'],
    trim: true,
    maxlength: [50, '标签名称不能超过50个字符'],
    unique: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, '标签描述不能超过200个字符']
  },
  color: {
    type: String,
    trim: true,
    default: '#1890ff'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
tagSchema.index({ name: 1 });
tagSchema.index({ usageCount: -1 });

// 虚拟字段
tagSchema.virtual('url').get(function() {
  return `/tag/${this.name}`;
});

// 静态方法
tagSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ usageCount: -1, name: 1 });
};

tagSchema.statics.findPopular = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ usageCount: -1 })
    .limit(limit);
};

tagSchema.statics.findByName = function(name) {
  return this.findOne({ name: { $regex: new RegExp(name, 'i') }, isActive: true });
};

// 实例方法
tagSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

tagSchema.methods.decrementUsage = function() {
  if (this.usageCount > 0) {
    this.usageCount -= 1;
    return this.save();
  }
  return Promise.resolve(this);
};

module.exports = mongoose.model('Tag', tagSchema); 