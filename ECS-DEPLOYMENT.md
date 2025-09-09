# 阿里云ECS部署指南（自建MongoDB）

## 方案优势
- 💰 **成本低**：无需额外购买数据库服务
- 🎯 **简单直接**：所有服务在一台服务器上
- 🔧 **完全控制**：可自定义配置和优化

## 部署架构
```
用户请求 → 域名 → 阿里云ECS
                    ↓
                 Nginx (80/443)
                    ↓
              Node.js应用 (3001)
                    ↓
              MongoDB (27017)
                    ↓
              阿里云OSS存储
```

## 第一步：准备阿里云ECS

### 1. 购买ECS实例
- **配置**：2核4GB内存，40GB系统盘
- **系统**：Ubuntu 20.04 LTS
- **网络**：公网IP，5Mbps带宽
- **安全组**：开放 22(SSH)、80(HTTP)、443(HTTPS) 端口

### 2. 连接服务器
```bash
ssh root@your-server-ip
```

## 第二步：安装基础环境

### 1. 更新系统
```bash
apt update && apt upgrade -y
```

### 2. 安装Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
```

### 3. 安装Nginx
```bash
apt install nginx -y
```

### 4. 安装PM2
```bash
npm install -g pm2
```

## 第三步：部署项目

### 1. 创建应用目录
```bash
mkdir -p /var/www/mengsblog-backend
cd /var/www/mengsblog-backend
```

### 2. 上传代码
```bash
# 方法一：使用Git（推荐）
git clone https://github.com/your-username/mengsblog-backend.git .

# 方法二：使用SCP上传
# scp -r /local/path/mengsblog-backend root@your-server-ip:/var/www/
```

### 3. 安装MongoDB
```bash
chmod +x setup-mongodb.sh
./setup-mongodb.sh
```

### 4. 配置环境变量
```bash
cp deploy.env.example deploy.env
nano deploy.env
```

**重要配置项：**
```bash
# MongoDB配置
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

### 5. 部署应用
```bash
chmod +x deploy.sh
./deploy.sh
```

## 第四步：配置Web服务器

### 1. 配置Nginx
```bash
# 复制配置文件
cp nginx.conf /etc/nginx/sites-available/mengsblog-backend

# 编辑配置（修改域名）
nano /etc/nginx/sites-available/mengsblog-backend

# 启用站点
ln -s /etc/nginx/sites-available/mengsblog-backend /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启Nginx
systemctl restart nginx
systemctl enable nginx
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

## 第五步：验证部署

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
curl https://your-domain.com/api/health

# 测试博客API
curl https://your-domain.com/api/blogs
```

## 常用管理命令

### MongoDB管理
```bash
# 连接数据库
mongosh

# 查看数据库
show dbs

# 使用博客数据库
use mengsblog

# 查看集合
show collections

# 状态检查
/usr/local/bin/mongodb-status.sh

# 手动备份
/usr/local/bin/backup-mongodb.sh
```

### 应用管理
```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs mengsblog-backend

# 重启应用
pm2 restart mengsblog-backend

# 停止应用
pm2 stop mengsblog-backend
```

### Nginx管理
```bash
# 测试配置
nginx -t

# 重载配置
nginx -s reload

# 查看日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 安全加固

### 1. 防火墙配置
```bash
# 安装UFW
apt install ufw -y

# 配置防火墙规则
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80
ufw allow 443

# 启用防火墙
ufw enable
```

### 2. SSH安全
```bash
# 编辑SSH配置
nano /etc/ssh/sshd_config

# 修改以下配置：
# Port 22
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes

# 重启SSH服务
systemctl restart sshd
```

### 3. 定期更新
```bash
# 设置自动更新
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
```

## 监控和维护

### 1. 系统监控
```bash
# 查看系统资源
htop
df -h
free -h

# 查看服务状态
systemctl status mongod nginx
pm2 status
```

### 2. 日志监控
```bash
# 应用日志
tail -f /var/www/mengsblog-backend/logs/combined.log

# MongoDB日志
tail -f /var/log/mongodb/mongod.log

# Nginx日志
tail -f /var/log/nginx/access.log
```

### 3. 备份策略
- **自动备份**：MongoDB每日2点自动备份
- **代码备份**：使用Git版本控制
- **配置备份**：定期备份配置文件

## 故障排除

### 常见问题
1. **MongoDB连接失败**
   - 检查服务状态：`systemctl status mongod`
   - 检查配置文件：`nano /etc/mongod.conf`
   - 查看日志：`tail -f /var/log/mongodb/mongod.log`

2. **应用无法启动**
   - 检查环境变量：`cat .env`
   - 查看PM2日志：`pm2 logs mengsblog-backend`
   - 检查端口占用：`netstat -tlnp | grep 3001`

3. **Nginx 502错误**
   - 检查Node.js应用是否运行
   - 查看Nginx错误日志
   - 确认代理配置正确

## 成本估算
- **ECS云服务器**：约100-200元/月
- **OSS存储**：按使用量，约10-50元/月
- **域名**：约50-100元/年
- **SSL证书**：免费（Let's Encrypt）
- **总计**：约150-350元/月

这个方案非常适合个人博客项目，成本低且易于管理！
