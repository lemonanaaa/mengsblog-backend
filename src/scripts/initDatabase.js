const mongoose = require('mongoose');
require('dotenv').config();

const Blog = require('../models/Blog');
const Category = require('../models/Category');
const Tag = require('../models/Tag');

const initDatabase = async () => {
  try {
    // 连接MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB连接成功');

    // 清空现有数据
    await Blog.deleteMany({});
    await Category.deleteMany({});
    await Tag.deleteMany({});
    console.log('✅ 清空现有数据完成');

    // 创建示例分类
    const categories = await Category.create([
      {
        name: '前端开发',
        description: '前端技术相关文章',
        slug: 'frontend-development',
        icon: 'code',
        color: '#1890ff',
        sortOrder: 1
      },
      {
        name: '后端开发',
        description: '后端技术相关文章',
        slug: 'backend-development',
        icon: 'server',
        color: '#52c41a',
        sortOrder: 2
      },
      {
        name: '算法与数据结构',
        description: '算法和数据结构相关文章',
        slug: 'algorithms-data-structures',
        icon: 'calculator',
        color: '#722ed1',
        sortOrder: 3
      },
      {
        name: '摄影技巧',
        description: '摄影技术和经验分享',
        slug: 'photography-tips',
        icon: 'camera',
        color: '#fa8c16',
        sortOrder: 4
      },
      {
        name: '生活随笔',
        description: '日常生活感悟和记录',
        slug: 'life-notes',
        icon: 'heart',
        color: '#eb2f96',
        sortOrder: 5
      }
    ]);
    console.log('✅ 示例分类创建完成');

    // 创建示例标签
    const tags = await Tag.create([
      { name: 'React', description: 'React框架相关', color: '#61dafb' },
      { name: 'TypeScript', description: 'TypeScript相关', color: '#3178c6' },
      { name: 'Node.js', description: 'Node.js相关', color: '#339933' },
      { name: 'MongoDB', description: 'MongoDB数据库相关', color: '#47a248' },
      { name: '算法', description: '算法相关', color: '#722ed1' },
      { name: '摄影', description: '摄影相关', color: '#fa8c16' },
      { name: '生活', description: '生活相关', color: '#eb2f96' },
      { name: '技术', description: '技术相关', color: '#1890ff' }
    ]);
    console.log('✅ 示例标签创建完成');

    // 创建示例博客文章
    const blogs = await Blog.create([
      {
        title: 'React 19 新特性详解',
        content: `
          <h1>React 19 新特性详解</h1>
          <p>React 19 带来了许多激动人心的新特性，让我们一起来了解一下：</p>
          <h2>1. 并发特性</h2>
          <p>React 19 进一步优化了并发渲染机制，提供了更好的用户体验。</p>
          <h2>2. 新的 Hooks</h2>
          <p>引入了 use() Hook，用于数据获取和资源管理。</p>
          <h2>3. 性能优化</h2>
          <p>更好的内存管理和渲染性能。</p>
        `,
        summary: '详细介绍React 19的新特性和改进',
        category: categories[0]._id,
        tags: ['React', 'TypeScript', '技术'],
        status: 'published',
        slug: 'react-19-new-features',
        metaTitle: 'React 19 新特性详解 - 前端技术分享',
        metaDescription: '详细介绍React 19的新特性，包括并发特性、新的Hooks和性能优化等',
        isFeatured: true
      },
      {
        title: 'TypeScript 高级类型技巧',
        content: `
          <h1>TypeScript 高级类型技巧</h1>
          <p>TypeScript 提供了强大的类型系统，让我们来看看一些高级技巧：</p>
          <h2>1. 条件类型</h2>
          <p>使用条件类型可以根据输入类型动态生成输出类型。</p>
          <h2>2. 映射类型</h2>
          <p>映射类型可以基于现有类型创建新类型。</p>
          <h2>3. 模板字面量类型</h2>
          <p>模板字面量类型提供了字符串字面量的类型安全。</p>
        `,
        summary: '分享TypeScript高级类型的使用技巧',
        category: categories[0]._id,
        tags: ['TypeScript', '技术'],
        status: 'published',
        slug: 'typescript-advanced-types',
        metaTitle: 'TypeScript 高级类型技巧 - 前端开发',
        metaDescription: '分享TypeScript高级类型的使用技巧，包括条件类型、映射类型等'
      },
      {
        title: 'Node.js 性能优化实践',
        content: `
          <h1>Node.js 性能优化实践</h1>
          <p>在生产环境中，Node.js 应用的性能优化至关重要：</p>
          <h2>1. 内存管理</h2>
          <p>合理管理内存使用，避免内存泄漏。</p>
          <h2>2. 异步处理</h2>
          <p>充分利用异步特性，提高并发处理能力。</p>
          <h2>3. 缓存策略</h2>
          <p>实施有效的缓存策略，减少重复计算。</p>
        `,
        summary: '分享Node.js应用性能优化的实践经验',
        category: categories[1]._id,
        tags: ['Node.js', '技术'],
        status: 'published',
        slug: 'nodejs-performance-optimization',
        metaTitle: 'Node.js 性能优化实践 - 后端开发',
        metaDescription: '分享Node.js应用性能优化的实践经验，包括内存管理、异步处理等'
      },
      {
        title: 'MongoDB 最佳实践指南',
        content: `
          <h1>MongoDB 最佳实践指南</h1>
          <p>MongoDB 作为文档型数据库，有其独特的使用方式：</p>
          <h2>1. 数据建模</h2>
          <p>合理的数据建模是MongoDB性能的关键。</p>
          <h2>2. 索引优化</h2>
          <p>正确使用索引可以大幅提升查询性能。</p>
          <h2>3. 聚合管道</h2>
          <p>灵活使用聚合管道进行复杂查询。</p>
        `,
        summary: '分享MongoDB使用的最佳实践',
        category: categories[1]._id,
        tags: ['MongoDB', '技术'],
        status: 'published',
        slug: 'mongodb-best-practices',
        metaTitle: 'MongoDB 最佳实践指南 - 数据库优化',
        metaDescription: '分享MongoDB使用的最佳实践，包括数据建模、索引优化等'
      }
    ]);
    console.log('✅ 示例博客文章创建完成');

    // 更新标签使用次数
    for (const blog of blogs) {
      for (const tagName of blog.tags) {
        const tag = await Tag.findOne({ name: tagName });
        if (tag) {
          tag.usageCount += 1;
          await tag.save();
        }
      }
    }

    console.log('✅ 数据库初始化完成！');
    console.log(`📊 创建了 ${categories.length} 个分类`);
    console.log(`🏷️ 创建了 ${tags.length} 个标签`);
    console.log(`📝 创建了 ${blogs.length} 篇博客文章`);

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB连接已关闭');
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase; 