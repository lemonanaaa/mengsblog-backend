const mongoose = require("mongoose");
const slugify = require("slugify");

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "文章标题不能为空"],
      trim: true,
      maxlength: [255, "标题不能超过255个字符"],
    },
    content: {
      type: String,
      required: [true, "文章内容不能为空"],
    },
    summary: {
      type: String,
      trim: true,
      maxlength: [500, "摘要不能超过500个字符"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    publishedAt: {
      type: Date,
    },
    author: {
      type: String,
      default: "Meng",
    },
    slug: {
      type: String,
      unique: true,
      required: false,  // 改为false，因为中间件会自动生成
    },
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [255, "SEO标题不能超过255个字符"],
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [500, "SEO描述不能超过500个字符"],
    },
    featuredImage: {
      type: String,
      trim: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    readingTime: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 索引
blogSchema.index({ title: "text", content: "text" });
blogSchema.index({ slug: 1 });
blogSchema.index({ status: 1 });
blogSchema.index({ category: 1 });
blogSchema.index({ publishedAt: -1 });
blogSchema.index({ createdAt: -1 });

// 虚拟字段
blogSchema.virtual("url").get(function () {
  return `/blog/${this.slug}`;
});

blogSchema.virtual("excerpt").get(function () {
  if (this.summary) return this.summary;
  return this.content.replace(/<[^>]*>/g, "").substring(0, 200) + "...";
});

// 中间件 - 保存前处理
blogSchema.pre("save", function (next) {

  // 生成slug - 如果没有slug或者title被修改了，就重新生成
  if (!this.slug || this.isModified("title")) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      locale: "zh",
    });
  }

  // 设置发布时间
  if (
    this.isModified("status") &&
    this.status === "published" &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }

  // 计算阅读时间（假设每分钟阅读300字）
  if (this.isModified("content")) {
    const wordCount = this.content.replace(/<[^>]*>/g, "").length;
    this.readingTime = Math.ceil(wordCount / 300);
  }

  // 设置默认的meta信息
  if (!this.metaTitle) {
    this.metaTitle = this.title;
  }
  if (!this.metaDescription) {
    this.metaDescription = this.summary || this.excerpt;
  }

  next();
});

// 静态方法
blogSchema.statics.findPublished = function () {
  return this.find({ status: "published" }).sort([['createdAt', -1], ['_id', -1]]);
};

blogSchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug, status: "published" });
};

blogSchema.statics.search = function (query) {
  return this.find(
    {
      $text: { $search: query },
      status: "published",
    },
    {
      score: { $meta: "textScore" },
    }
  ).sort({ score: { $meta: "textScore" } });
};

// 实例方法
blogSchema.methods.incrementViewCount = function () {
  this.viewCount += 1;
  return this.save();
};

blogSchema.methods.addTag = function (tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    return this.save();
  }
  return Promise.resolve(this);
};

blogSchema.methods.removeTag = function (tag) {
  this.tags = this.tags.filter((t) => t !== tag);
  return this.save();
};

module.exports = mongoose.model("Blog", blogSchema);
