const Blog = require('../models/Blog');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const Joi = require('joi');

// 验证模式
const blogSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  content: Joi.string().required(),
  summary: Joi.string().max(500).optional(),
  category: Joi.string().hex().length(24).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  status: Joi.string().valid('draft', 'published', 'archived').default('draft'),
  metaTitle: Joi.string().max(255).optional(),
  metaDescription: Joi.string().max(500).optional(),
  featuredImage: Joi.string().uri().optional(),
  isFeatured: Joi.boolean().default(false),
  slug: Joi.string().optional()
});

// 获取所有博客
const getAllBlogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      category, 
      search, 
      tag,
      featured 
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    // 构建查询条件
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (featured === 'true') query.isFeatured = true;
    if (tag) query.tags = { $in: [tag] };
    if (search) {
      query.$text = { $search: search };
    }

    // 执行查询
    const blogs = await Blog.find(query)
      .populate('category', 'name slug')
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // 获取总数
    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      data: blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取博客列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取博客列表失败',
      error: error.message
    });
  }
};

// 根据ID获取博客
const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const blog = await Blog.findById(id)
      .populate('category', 'name slug description');

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: '博客不存在'
      });
    }

    // 增加浏览次数
    await blog.incrementViewCount();

    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error('获取博客详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取博客详情失败',
      error: error.message
    });
  }
};

// 根据slug获取博客
const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const blog = await Blog.findBySlug(slug)
      .populate('category', 'name slug description');

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: '博客不存在'
      });
    }

    // 增加浏览次数
    await blog.incrementViewCount();

    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error('获取博客详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取博客详情失败',
      error: error.message
    });
  }
};

// 创建博客
const createBlog = async (req, res) => {
  try {
    const { error, value } = blogSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        error: error.details[0].message
      });
    }

    // 验证分类是否存在
    if (value.category) {
      const category = await Category.findById(value.category);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: '指定的分类不存在'
        });
      }
    }

    // 如果没有提供slug，自动生成
    if (!value.slug) {
      const slugify = require('slugify');
      value.slug = slugify(value.title, {
        lower: true,
        strict: true,
        locale: "zh",
      });
      console.log('Generated slug:', value.slug);
    }

    const blog = new Blog(value);
    await blog.save();
    // 更新标签使用次数
    if (value.tags && value.tags.length > 0) {
      for (const tagName of value.tags) {
        let tag = await Tag.findOne({ name: tagName });
        if (!tag) {
          tag = new Tag({ name: tagName });
        }
        await tag.incrementUsage();
      }
    }

    const createdBlog = await Blog.findById(blog._id)
      .populate('category', 'name slug');

    res.status(201).json({
      success: true,
      message: '博客创建成功',
      data: createdBlog
    });
  } catch (error) {
    console.error('创建博客失败:', error);
    res.status(500).json({
      success: false,
      message: '创建博客失败',
      error: error.message
    });
  }
};

// 更新博客
const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = blogSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        error: error.details[0].message
      });
    }

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: '博客不存在'
      });
    }

    // 验证分类是否存在
    if (value.category) {
      const category = await Category.findById(value.category);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: '指定的分类不存在'
        });
      }
    }

    // 处理标签变化
    const oldTags = blog.tags || [];
    const newTags = value.tags || [];
    
    // 减少旧标签的使用次数
    for (const tagName of oldTags) {
      if (!newTags.includes(tagName)) {
        const tag = await Tag.findOne({ name: tagName });
        if (tag) {
          await tag.decrementUsage();
        }
      }
    }

    // 增加新标签的使用次数
    for (const tagName of newTags) {
      if (!oldTags.includes(tagName)) {
        let tag = await Tag.findOne({ name: tagName });
        if (!tag) {
          tag = new Tag({ name: tagName });
        }
        await tag.incrementUsage();
      }
    }

    // 更新博客
    Object.assign(blog, value);
    await blog.save();

    const updatedBlog = await Blog.findById(id)
      .populate('category', 'name slug');

    res.json({
      success: true,
      message: '博客更新成功',
      data: updatedBlog
    });
  } catch (error) {
    console.error('更新博客失败:', error);
    res.status(500).json({
      success: false,
      message: '更新博客失败',
      error: error.message
    });
  }
};

// 删除博客
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: '博客不存在'
      });
    }

    // 减少标签使用次数
    if (blog.tags && blog.tags.length > 0) {
      for (const tagName of blog.tags) {
        const tag = await Tag.findOne({ name: tagName });
        if (tag) {
          await tag.decrementUsage();
        }
      }
    }

    await Blog.findByIdAndDelete(id);

    res.json({
      success: true,
      message: '博客删除成功'
    });
  } catch (error) {
    console.error('删除博客失败:', error);
    res.status(500).json({
      success: false,
      message: '删除博客失败',
      error: error.message
    });
  }
};

// 搜索博客
const searchBlogs = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: '搜索关键词不能为空'
      });
    }

    const skip = (page - 1) * limit;
    
    const blogs = await Blog.search(q)
      .populate('category', 'name slug')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Blog.countDocuments({
      $text: { $search: q },
      status: 'published'
    });

    res.json({
      success: true,
      data: blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('搜索博客失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索博客失败',
      error: error.message
    });
  }
};

module.exports = {
  getAllBlogs,
  getBlogById,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
  searchBlogs
}; 