const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '分类名称不能为空'],
    trim: true,
    maxlength: [100, '分类名称不能超过100个字符'],
    unique: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, '分类描述不能超过500个字符']
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  slug: {
    type: String,
    unique: true,
    required: true
  },
  icon: {
    type: String,
    trim: true
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
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ sortOrder: 1 });

// 虚拟字段
categorySchema.virtual('url').get(function() {
  return `/category/${this.slug}`;
});

categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});

categorySchema.virtual('blogCount', {
  ref: 'Blog',
  localField: '_id',
  foreignField: 'category',
  count: true
});

// 中间件 - 保存前处理
categorySchema.pre('save', function(next) {
  // 生成slug
  if (this.isModified('name') && !this.slug) {
    this.slug = slugify(this.name, { 
      lower: true, 
      strict: true,
      locale: 'zh'
    });
  }
  next();
});

// 静态方法
categorySchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
};

categorySchema.statics.findRootCategories = function() {
  return this.find({ parent: null, isActive: true }).sort({ sortOrder: 1, name: 1 });
};

categorySchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, isActive: true });
};

// 实例方法
categorySchema.methods.getChildren = function() {
  return this.model('Category').find({ parent: this._id, isActive: true });
};

categorySchema.methods.getAncestors = async function() {
  const ancestors = [];
  let current = this;
  
  while (current.parent) {
    current = await this.model('Category').findById(current.parent);
    if (current) {
      ancestors.unshift(current);
    } else {
      break;
    }
  }
  
  return ancestors;
};

module.exports = mongoose.model('Category', categorySchema); 