# API 接口文档

## 基础信息
- **基础URL**: `http://localhost:3001/api`
- **健康检查**: `GET /api/health`

## 📝 博客管理接口

### 博客CRUD操作
- `GET /api/blogs` - 获取所有博客
- `GET /api/blogs/search` - 搜索博客
- `GET /api/blogs/:id` - 根据ID获取博客
- `GET /api/blogs/slug/:slug` - 根据slug获取博客
- `POST /api/blogs` - 创建博客
- `PUT /api/blogs/:id` - 更新博客
- `DELETE /api/blogs/:id` - 删除博客

### 分类管理
- `GET /api/categories` - 获取所有分类
- `GET /api/categories/:id` - 根据ID获取分类
- `GET /api/categories/slug/:slug` - 根据slug获取分类
- `POST /api/categories` - 创建分类
- `PUT /api/categories/:id` - 更新分类
- `DELETE /api/categories/:id` - 删除分类

### 兼容接口
- `POST /api/initblog` - 初始化博客（兼容原有接口）

---

## 📸 照片管理接口

### 图片管理
- `GET /api/photos` - 获取所有图片
- `GET /api/photos/retouched` - 获取所有精修图片
- `GET /api/photos/:id` - 获取单张图片详情
- `PUT /api/photos/:id` - 更新图片信息
- `DELETE /api/photos/:id` - 删除单张图片
- `DELETE /api/photos` - 批量删除图片

### 图片上传
- `POST /api/photos/upload` - 统一的图片上传接口（支持普通图片和精修图片）

### 拍摄批次管理
- `GET /api/shoot-sessions` - 获取所有批次
- `GET /api/shoot-sessions/overview` - 获取所有批次概览（包含代表性照片）
- `GET /api/shoot-sessions/:id` - 获取单个批次详情
- `POST /api/shoot-sessions` - 创建新批次
- `PUT /api/shoot-sessions/:id` - 修改批次信息
- `DELETE /api/shoot-sessions/:id` - 删除批次

### 批次照片查询
- `GET /api/shoot-sessions/:sessionId/photos` - 获取某个批次的所有照片
- `POST /api/shoot-sessions/:sessionId/photos` - 获取某个批次的所有照片（支持请求体传参）

#### 参数说明
- `page` (可选): 页码，默认为1
- `limit` (可选): 每页数量，默认为50
- `isMeng` (可选): 是否显示所有批次，默认为false
- `types` (可选): 图片类型筛选，支持以下值：
  - `all`: 返回所有图片（默认）
  - `retouched`: 只返回精修图片
  - 数组形式: `['all', 'retouched']` 同时返回所有图片和精修图片

#### 返回数据格式
```json
{
  "success": true,
  "data": {
    "shootSession": {
      "id": "批次ID",
      "name": "批次名称",
      "theme": "主题",
      "shootDate": "拍摄日期",
      "friendName": "朋友姓名",
      "friendFullName": "朋友全名",
      "phoneTail": "手机尾号",
      "shootLocation": "拍摄地点",
      "description": "描述",
      "totalPhotos": "总图片数",
      "retouchedPhotos": "精修图片数",
      "publishedPhotos": "已发布图片数",
      "isPublic": "是否公开",
      "tags": ["标签数组"],
      "isFeatured": "是否精选",
      "sortOrder": "排序",
      "author": "作者",
      "createdAt": "创建时间",
      "updatedAt": "更新时间"
    },
    "photos": "所有图片数组（当types包含'all'时）",
    "retouchedPhotos": "精修图片数组（当types包含'retouched'时）",
    "pagination": {
      "page": "当前页码",
      "limit": "每页数量",
      "total": "总数量",
      "pages": "总页数"
    },
    "stats": {
      "totalPhotos": "总图片数",
      "retouchedPhotos": "精修图片数",
      "normalPhotos": "普通图片数"
    }
  }
}
```

#### 使用示例

**GET请求（URL参数）：**
```
# 获取所有图片
GET /api/shoot-sessions/68be8a0adfd67e456d65fd9e/photos?types=all

# 只获取精修图片
GET /api/shoot-sessions/68be8a0adfd67e456d65fd9e/photos?types=retouched

# 同时获取所有图片和精修图片
GET /api/shoot-sessions/68be8a0adfd67e456d65fd9e/photos?types[]=all&types[]=retouched

# 分页获取
GET /api/shoot-sessions/68be8a0adfd67e456d65fd9e/photos?page=1&limit=20&types=all
```

**POST请求（请求体参数）：**
```
# 获取所有图片
POST /api/shoot-sessions/68be8a0adfd67e456d65fd9e/photos
Content-Type: application/json
{
  "page": 1,
  "limit": 20,
  "types": "all"
}

# 只获取精修图片
POST /api/shoot-sessions/68be8a0adfd67e456d65fd9e/photos
Content-Type: application/json
{
  "page": 1,
  "limit": 10,
  "types": "retouched"
}

# 同时获取所有图片和精修图片
POST /api/shoot-sessions/68be8a0adfd67e456d65fd9e/photos
Content-Type: application/json
{
  "page": 1,
  "limit": 50,
  "types": ["all", "retouched"]
}
```

---

## 🔧 使用说明

### 1. 所有接口都带有 `/api` 前缀
- 前端路由: `/shoot-sessions/overview`
- 后端API: `/api/shoot-sessions/overview`

### 2. 图片上传流程
```
1. 创建拍摄批次 → POST /api/shoot-sessions
2. 上传照片到批次 → POST /api/photos/upload
3. 查看批次概览 → GET /api/shoot-sessions/overview
4. 查看批次详情 → GET /api/shoot-sessions/:id/photos
```

### 3. 博客管理流程
```
1. 创建分类 → POST /api/categories
2. 创建博客 → POST /api/blogs
3. 查看博客列表 → GET /api/blogs
4. 编辑博客 → PUT /api/blogs/:id
```

---

## 📋 注意事项

- 所有接口都支持CORS
- 图片上传支持多文件上传
- 支持分页和搜索功能
- 错误响应统一格式
- 健康检查接口: `/api/health`
- **新增**: 只有4个字段是必填的，其他都是可选的
- **新增**: 支持自动生成批次名称和默认值设置
- **新增**: 支持按朋友信息进行筛选和搜索
