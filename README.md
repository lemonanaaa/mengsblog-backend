# Meng's Blog Backend API (MongoDB)

这是Meng's Blog的后端API服务，基于Node.js + Express + MongoDB构建。

## 🚀 功能特性

- **博客管理**: 完整的博客CRUD操作
- **分类管理**: 支持层级分类结构
- **标签系统**: 灵活的标签管理，自动统计使用次数
- **富文本编辑**: 支持HTML内容编辑
- **SEO优化**: 支持meta标签和slug
- **全文搜索**: 基于MongoDB文本索引的搜索功能
- **数据验证**: 使用Joi进行数据验证
- **错误处理**: 完善的错误处理机制
- **阅读时间**: 自动计算文章阅读时间

## 📋 技术栈

- **Node.js**: 运行环境
- **Express**: Web框架
- **MongoDB**: 文档型数据库
- **Mongoose**: MongoDB ODM
- **Joi**: 数据验证
- **CORS**: 跨域处理
- **Helmet**: 安全中间件

## 🛠️ 安装和运行

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 环境配置

复制环境变量文件并配置：

```bash
cp env.example .env
```

编辑 `.env` 文件，配置MongoDB连接信息：

```env
# MongoDB配置
MONGODB_URI=mongodb://localhost:27017/mengsblog
MONGODB_URI_PROD=mongodb://localhost:27017/mengsblog

# 服务器配置
PORT=3001
NODE_ENV=development

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# CORS配置
CORS_ORIGIN=http://localhost:3000
```

### 3. MongoDB准备

确保MongoDB服务运行：

```bash
# macOS (使用Homebrew)
brew services start mongodb-community

# Ubuntu/Debian
sudo systemctl start mongod

# Windows
net start MongoDB
```

### 4. 初始化数据库

```bash
# 初始化数据库表结构和示例数据
node src/scripts/initDatabase.js
```

### 5. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务将在 `http://localhost:3001` 启动。

## 📚 API文档

### 博客相关API

#### 获取博客列表
```
GET /api/blogs
```

查询参数：
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 10)
- `status`: 状态筛选 (draft/published/archived)
- `category`: 分类ID筛选
- `tag`: 标签筛选
- `featured`: 推荐文章筛选 (true/false)
- `search`: 搜索关键词

#### 搜索博客
```
GET /api/blogs/search?q=关键词
```

#### 获取博客详情
```
GET /api/blogs/:id
GET /api/blogs/slug/:slug
```

#### 创建博客
```
POST /api/blogs
```

请求体：
```json
{
  "title": "文章标题",
  "content": "<p>文章内容</p>",
  "summary": "文章摘要",
  "category": "分类ID",
  "tags": ["标签1", "标签2"],
  "status": "draft",
  "metaTitle": "SEO标题",
  "metaDescription": "SEO描述",
  "isFeatured": false
}
```

#### 更新博客
```
PUT /api/blogs/:id
```

#### 删除博客
```
DELETE /api/blogs/:id
```

### 分类相关API

#### 获取分类列表
```
GET /api/categories
```

查询参数：
- `active`: 只获取激活的分类 (true/false)
- `root`: 只获取根分类 (true/false)

#### 创建分类
```
POST /api/categories
```

#### 更新分类
```
PUT /api/categories/:id
```

#### 删除分类
```
DELETE /api/categories/:id
```

## 🗄️ 数据库结构

### blogs集合
```javascript
{
  _id: ObjectId,
  title: String,           // 文章标题
  content: String,         // 文章内容(HTML)
  summary: String,         // 文章摘要
  category: ObjectId,      // 分类引用
  tags: [String],          // 标签数组
  status: String,          // 状态(draft/published/archived)
  viewCount: Number,       // 浏览次数
  publishedAt: Date,       // 发布时间
  author: String,          // 作者
  slug: String,            // URL友好的标题
  metaTitle: String,       // SEO标题
  metaDescription: String, // SEO描述
  featuredImage: String,   // 特色图片URL
  isFeatured: Boolean,     // 是否推荐
  readingTime: Number,     // 阅读时间(分钟)
  createdAt: Date,
  updatedAt: Date
}
```

### categories集合
```javascript
{
  _id: ObjectId,
  name: String,            // 分类名称
  description: String,     // 分类描述
  parent: ObjectId,        // 父分类引用
  slug: String,            // URL友好的名称
  icon: String,            // 图标
  color: String,           // 颜色
  isActive: Boolean,       // 是否激活
  sortOrder: Number,       // 排序
  createdAt: Date,
  updatedAt: Date
}
```

### tags集合
```javascript
{
  _id: ObjectId,
  name: String,            // 标签名称
  description: String,     // 标签描述
  color: String,           // 颜色
  isActive: Boolean,       // 是否激活
  usageCount: Number,      // 使用次数
  createdAt: Date,
  updatedAt: Date
}
```

## 🔧 开发指南

### 项目结构
```
backend/
├── src/
│   ├── config/          # 配置文件
│   ├── controllers/     # 控制器
│   ├── models/          # 数据模型
│   ├── routes/          # 路由
│   ├── scripts/         # 脚本文件
│   └── app.js          # 主应用文件
├── package.json
├── env.example
└── README.md
```

### MongoDB优势

1. **文档型存储**: 更适合存储博客这种文档型数据
2. **灵活的数据结构**: 可以轻松添加新字段
3. **原生JSON支持**: 与JavaScript无缝集成
4. **强大的查询能力**: 支持复杂的聚合查询
5. **水平扩展**: 易于扩展和分片
6. **全文搜索**: 内置文本搜索功能

### 添加新的API端点

1. 在 `controllers/` 目录下创建控制器
2. 在 `routes/` 目录下创建路由
3. 在 `app.js` 中注册路由

### 数据库索引

项目已配置以下索引：
- 博客标题和内容的文本索引
- slug唯一索引
- 状态、分类、发布时间索引
- 标签使用次数索引

## 🚀 部署

### 生产环境配置

1. 设置 `NODE_ENV=production`
2. 配置生产MongoDB连接
3. 设置强密码的JWT密钥
4. 配置CORS允许的域名

### Docker部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### MongoDB Atlas (云数据库)

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mengsblog
```

## 📊 性能优化

1. **索引优化**: 为常用查询字段创建索引
2. **聚合管道**: 使用MongoDB聚合进行复杂查询
3. **分页查询**: 使用skip和limit进行分页
4. **数据投影**: 只返回需要的字段
5. **连接池**: 合理配置MongoDB连接池

## �� 许可证

MIT License 