const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const categoryController = require('../controllers/categoryController');

// 博客CRUD路由
router.get('/blogs', blogController.getAllBlogs);
router.get('/blogs/search', blogController.searchBlogs);
router.get('/blogs/:id', blogController.getBlogById);
router.get('/blogs/slug/:slug', blogController.getBlogBySlug);
router.post('/blogs', blogController.createBlog);
router.put('/blogs/:id', blogController.updateBlog);
router.delete('/blogs/:id', blogController.deleteBlog);

// 分类CRUD路由
router.get('/categories', categoryController.getAllCategories);
router.get('/categories/:id', categoryController.getCategoryById);
router.get('/categories/slug/:slug', categoryController.getCategoryBySlug);
router.post('/categories', categoryController.createCategory);
router.put('/categories/:id', categoryController.updateCategory);
router.delete('/categories/:id', categoryController.deleteCategory);

// 兼容原有的API端点
router.post('/initblog', blogController.createBlog);

module.exports = router; 