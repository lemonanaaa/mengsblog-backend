# 阿里云部署指南

## 准备工作

### 1. 阿里云ECS实例
- 推荐配置：2核4GB内存，40GB系统盘
- 操作系统：Ubuntu 20.04 LTS 或 CentOS 7
- 安全组：开放80、443、22端口

### 2. 域名和SSL证书
- 购买域名并解析到ECS公网IP
- 申请SSL证书（推荐使用Let's Encrypt免费证书）

### 3. 数据库
- 推荐使用阿里云MongoDB服务
- 或自建MongoDB实例

## 部署步骤

### 1. 连接服务器
```bash
ssh root@your-server-ip
```

### 2. 安装必要软件
```bash
# 更新系统
apt update && apt upgrade -y

# 安装Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# 安装Nginx
apt install nginx -y

# 安装Git
apt install git -y

# 安装PM2
npm install -g pm2
```

### 3. 配置项目
```bash
# 创建应用目录
mkdir -p /var/www/mengsblog-backend
cd /var/www/mengsblog-backend

# 克隆代码
git clone https://github.com/your-username/mengsblog-backend.git .

# 配置环境变量
cp deploy.env.example deploy.env
nano deploy.env  # 编辑配置文件
```

### 4. 配置Nginx
```bash
# 复制Nginx配置
cp nginx.conf /etc/nginx/sites-available/mengsblog-backend

# 编辑配置文件，修改域名
nano /etc/nginx/sites-available/mengsblog-backend

# 创建软链接
ln -s /etc/nginx/sites-available/mengsblog-backend /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启Nginx
systemctl restart nginx
systemctl enable nginx
```

### 5. 配置SSL证书
```bash
# 安装Certbot
apt install certbot python3-certbot-nginx -y

# 申请证书
certbot --nginx -d your-domain.com

# 设置自动续期
crontab -e
# 添加以下行：
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 6. 部署应用
```bash
# 给部署脚本执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

### 7. 验证部署
```bash
# 检查PM2状态
pm2 status

# 查看日志
pm2 logs mengsblog-backend

# 测试API
curl https://your-domain.com/api/health
```

## 常用命令

### PM2管理
```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs mengsblog-backend

# 重启应用
pm2 restart mengsblog-backend

# 停止应用
pm2 stop mengsblog-backend

# 删除应用
pm2 delete mengsblog-backend

# 监控
pm2 monit
```

### Nginx管理
```bash
# 测试配置
nginx -t

# 重载配置
nginx -s reload

# 重启服务
systemctl restart nginx

# 查看状态
systemctl status nginx
```

### 日志查看
```bash
# 应用日志
tail -f /var/www/mengsblog-backend/logs/combined.log

# Nginx日志
tail -f /var/log/nginx/mengsblog-backend.access.log
tail -f /var/log/nginx/mengsblog-backend.error.log
```

## 监控和维护

### 1. 设置监控
- 使用PM2监控面板
- 配置阿里云云监控
- 设置日志轮转

### 2. 备份策略
- 定期备份MongoDB数据
- 备份应用代码和配置
- 备份SSL证书

### 3. 安全加固
- 定期更新系统和依赖
- 配置防火墙规则
- 使用强密码和SSH密钥

## 故障排除

### 常见问题
1. **应用无法启动**
   - 检查环境变量配置
   - 查看PM2日志
   - 确认端口未被占用

2. **Nginx 502错误**
   - 检查Node.js应用是否运行
   - 查看Nginx错误日志
   - 确认代理配置正确

3. **SSL证书问题**
   - 检查证书是否过期
   - 确认域名解析正确
   - 验证证书文件路径

### 联系支持
如遇到问题，请检查日志文件或联系技术支持。
