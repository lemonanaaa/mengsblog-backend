#!/bin/bash

# 阿里云ECS部署脚本（包含MongoDB自建）
set -e  # 遇到错误立即退出

echo "🚀 开始部署到阿里云ECS..."

# 检查是否为root用户
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  建议不要使用root用户运行此脚本"
fi

# 检查MongoDB是否已安装
if ! command -v mongod &> /dev/null; then
    echo "🍃 MongoDB未安装，开始安装MongoDB..."
    chmod +x setup-mongodb.sh
    ./setup-mongodb.sh
    echo "✅ MongoDB安装完成"
else
    echo "✅ MongoDB已安装"
fi

# 1. 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin master

# 2. 安装/更新依赖
echo "📦 安装依赖..."
npm ci --production

# 3. 创建必要目录
echo "📁 创建必要目录..."
mkdir -p logs
mkdir -p uploads/photos
mkdir -p uploads/retouched
mkdir -p uploads/temp

# 4. 复制环境变量文件
if [ -f "deploy.env" ]; then
    cp deploy.env .env
    echo "✅ 环境变量文件已复制"
else
    echo "❌ 错误: deploy.env 文件不存在，请创建并配置环境变量"
    exit 1
fi

# 5. 安装PM2（如果未安装）
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装PM2..."
    npm install -g pm2
fi

# 6. 停止旧进程（如果存在）
echo "🛑 停止旧进程..."
pm2 stop mengsblog-backend 2>/dev/null || true
pm2 delete mengsblog-backend 2>/dev/null || true

# 7. 启动应用
echo "🚀 启动应用..."
pm2 start ecosystem.config.js --env production

# 8. 保存PM2配置
pm2 save

# 9. 设置PM2开机自启
pm2 startup

echo "✅ 部署完成！"
echo "📊 查看应用状态: pm2 status"
echo "📝 查看日志: pm2 logs mengsblog-backend"
echo "🔄 重启应用: pm2 restart mengsblog-backend"
