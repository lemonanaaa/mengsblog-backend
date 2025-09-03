const Category = require('../models/Category');
const Joi = require('joi');

// 验证模式
const categorySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  parent: Joi.string().hex().length(24).optional(),
  icon: Joi.string().optional(),
  color: Joi.string().optional(),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().default(0)
});

// 获取所有分类
const getAllCategories = async (req, res) => {
  try {
    const { active, root } = req.query;
    
    let query = Category.find();
    
    if (active === 'true') {
      query = Category.findActive();
    } else if (root === 'true') {
      query = Category.findRootCategories();
    }
    
    const categories = await query.populate('children', 'name slug');
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('获取分类列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分类列表失败',
      error: error.message
    });
  }
};

// 根据ID获取分类
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findById(id)
      .populate('parent', 'name slug')
      .populate('children', 'name slug description');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('获取分类详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分类详情失败',
      error: error.message
    });
  }
};

// 根据slug获取分类
const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const category = await Category.findBySlug(slug)
      .populate('parent', 'name slug')
      .populate('children', 'name slug description');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('获取分类详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分类详情失败',
      error: error.message
    });
  }
};

// 创建分类
const createCategory = async (req, res) => {
  try {
    const { error, value } = categorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        error: error.details[0].message
      });
    }

    // 验证父分类是否存在
    if (value.parent) {
      const parentCategory = await Category.findById(value.parent);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: '指定的父分类不存在'
        });
      }
    }

    const category = new Category(value);
    await category.save();

    const createdCategory = await Category.findById(category._id)
      .populate('parent', 'name slug');

    res.status(201).json({
      success: true,
      message: '分类创建成功',
      data: createdCategory
    });
  } catch (error) {
    console.error('创建分类失败:', error);
    res.status(500).json({
      success: false,
      message: '创建分类失败',
      error: error.message
    });
  }
};

// 更新分类
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = categorySchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        error: error.details[0].message
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 验证父分类是否存在
    if (value.parent) {
      const parentCategory = await Category.findById(value.parent);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: '指定的父分类不存在'
        });
      }
      
      // 防止循环引用
      if (value.parent === id) {
        return res.status(400).json({
          success: false,
          message: '不能将自己设为父分类'
        });
      }
    }

    Object.assign(category, value);
    await category.save();

    const updatedCategory = await Category.findById(id)
      .populate('parent', 'name slug')
      .populate('children', 'name slug');

    res.json({
      success: true,
      message: '分类更新成功',
      data: updatedCategory
    });
  } catch (error) {
    console.error('更新分类失败:', error);
    res.status(500).json({
      success: false,
      message: '更新分类失败',
      error: error.message
    });
  }
};

// 删除分类
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 检查是否有子分类
    const children = await Category.find({ parent: id });
    if (children.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该分类下有子分类，无法删除'
      });
    }

    await Category.findByIdAndDelete(id);

    res.json({
      success: true,
      message: '分类删除成功'
    });
  } catch (error) {
    console.error('删除分类失败:', error);
    res.status(500).json({
      success: false,
      message: '删除分类失败',
      error: error.message
    });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
}; 