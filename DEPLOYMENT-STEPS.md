# 部署操作步骤详解

## 准备工作（在本地Mac上）

### 1. 确保代码已提交
```bash
cd /Users/mli/selfwork/mengsblog-backend

# 检查文件状态
git status

# 添加所有文件
git add .

# 提交更改
git commit -m "添加阿里云ECS部署配置"

# 推送到远程仓库
git push origin master
```

### 2. 准备ECS服务器信息
- ECS公网IP地址
- SSH密钥或密码
- 域名（如果有）

## 第一步：连接ECS服务器

### 1. 使用SSH连接
```bash
# 使用密码连接
ssh root@your-ecs-public-ip

# 或使用密钥连接
ssh -i /path/to/your-key.pem root@your-ecs-public-ip
```

### 2. 验证连接
```bash
# 检查系统信息
uname -a
cat /etc/os-release

# 检查网络
ping -c 3 8.8.8.8
```

## 第二步：在ECS上安装基础环境

### 1. 更新系统
```bash
apt update && apt upgrade -y
```

### 2. 安装Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### 3. 安装Nginx
```bash
apt install nginx -y

# 启动Nginx
systemctl start nginx
systemctl enable nginx

# 验证安装
systemctl status nginx
```

### 4. 安装PM2
```bash
npm install -g pm2

# 验证安装
pm2 --version
```

## 第三步：部署项目代码

### 1. 创建应用目录
```bash
mkdir -p /var/www/mengsblog-backend
cd /var/www/mengsblog-backend
```

### 2. 克隆代码（包含所有部署脚本）
```bash
# 克隆代码
git clone https://github.com/your-username/mengsblog-backend.git .

# 查看文件
ls -la

# 确认部署脚本存在
ls -la *.sh
```

### 3. 配置环境变量
```bash
# 复制环境变量模板
cp deploy.env.example deploy.env

# 编辑配置文件
nano deploy.env
```

**重要配置项：**
```bash
# MongoDB配置（本地安装）
MONGODB_URI=mongodb://mengsblog_user:your_password@localhost:27017/mengsblog

# JWT密钥（使用强密码）
JWT_SECRET=your_very_strong_jwt_secret_here

# 前端域名
CORS_ORIGIN=https://your-domain.com

# 阿里云OSS配置
ALIYUN_OSS_ACCESS_KEY_ID=your_access_key
ALIYUN_OSS_ACCESS_KEY_SECRET=your_secret_key
ALIYUN_OSS_BUCKET=your_bucket_name
ALIYUN_OSS_REGION=oss-cn-shanghai
ALIYUN_OSS_ENDPOINT=oss-cn-shanghai.aliyuncs.com
```

## 第四步：执行部署脚本

### 1. 给脚本执行权限
```bash
chmod +x setup-mongodb.sh
chmod +x deploy.sh
```

### 2. 安装MongoDB
```bash
# 执行MongoDB安装脚本
./setup-mongodb.sh
```

### 3. 部署应用
```bash
# 执行部署脚本
./deploy.sh
```

## 第五步：配置Web服务器

### 1. 配置Nginx
```bash
# 复制Nginx配置
cp nginx.conf /etc/nginx/sites-available/mengsblog-backend

# 编辑配置文件（修改域名）
nano /etc/nginx/sites-available/mengsblog-backend

# 启用站点
ln -s /etc/nginx/sites-available/mengsblog-backend /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启Nginx
systemctl restart nginx
```

### 2. 配置SSL证书
```bash
# 安装Certbot
apt install certbot python3-certbot-nginx -y

# 申请免费SSL证书
certbot --nginx -d your-domain.com

# 设置自动续期
crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

## 第六步：验证部署

### 1. 检查服务状态
```bash
# 检查MongoDB
systemctl status mongod

# 检查Node.js应用
pm2 status

# 检查Nginx
systemctl status nginx
```

### 2. 测试API
```bash
# 测试健康检查
curl http://localhost:3001/api/health

# 测试外部访问
curl https://your-domain.com/api/health
```

## 文件位置说明

### 在ECS服务器上的文件结构
```
/var/www/mengsblog-backend/
├── src/                    # 应用源代码
├── deploy.sh              # 部署脚本
├── setup-mongodb.sh       # MongoDB安装脚本
├── ecosystem.config.js    # PM2配置
├── nginx.conf            # Nginx配置
├── deploy.env            # 环境变量配置
├── package.json          # 项目依赖
└── logs/                 # 应用日志
```

### 脚本执行位置
- ✅ **所有脚本都在ECS上执行**
- ✅ **代码通过Git克隆到ECS**
- ✅ **配置文件在ECS上编辑**

## 常见问题

### 1. 如何上传代码到ECS？
**推荐方式：Git克隆**
```bash
# 在ECS上执行
git clone https://github.com/your-username/mengsblog-backend.git /var/www/mengsblog-backend
```

### 2. 如何修改配置文件？
```bash
# 在ECS上编辑
nano /var/www/mengsblog-backend/deploy.env
```

### 3. 如何查看日志？
```bash
# 在ECS上查看
tail -f /var/www/mengsblog-backend/logs/combined.log
```

### 4. 如何重启应用？
```bash
# 在ECS上执行
pm2 restart mengsblog-backend
```

## 总结

1. **本地准备**：提交代码到Git仓库
2. **连接ECS**：使用SSH连接到阿里云服务器
3. **安装环境**：在ECS上安装Node.js、Nginx、PM2
4. **克隆代码**：在ECS上克隆包含部署脚本的代码
5. **执行部署**：在ECS上运行部署脚本
6. **配置服务**：在ECS上配置Nginx和SSL
7. **验证部署**：测试应用是否正常运行

**关键点：所有操作都在ECS服务器上执行，本地只是准备和提交代码！**
