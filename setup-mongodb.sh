#!/bin/bash

# MongoDB安装和配置脚本
set -e

echo "🍃 开始检查和配置MongoDB..."

# 检查MongoDB是否已安装
if command -v mongod &> /dev/null; then
    echo "✅ MongoDB已安装，版本："
    mongod --version | head -1
    echo "🔄 跳过安装步骤，直接进行配置..."
else
    echo "📦 MongoDB未安装，开始安装..."
    
    # 1. 更新系统包
    echo "📦 更新系统包..."
    apt update

# 2. 安装必要的工具
echo "🔧 安装必要工具..."
apt install -y wget curl gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release

# 3. 添加MongoDB官方GPG密钥
echo "🔑 添加MongoDB GPG密钥..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -

# 4. 添加MongoDB仓库
echo "📋 添加MongoDB仓库..."
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# 5. 更新包列表
echo "🔄 更新包列表..."
apt update

# 6. 安装MongoDB
echo "🍃 安装MongoDB..."
apt install -y mongodb-org

# 7. 启动MongoDB服务
echo "🚀 启动MongoDB服务..."
systemctl start mongod
systemctl enable mongod

# 8. 检查MongoDB状态
echo "✅ 检查MongoDB状态..."
systemctl status mongod --no-pager

fi  # 结束MongoDB安装检查

# 9. 创建数据库和用户
echo "👤 创建数据库用户..."
mongosh --eval "
use mengsblog;
db.createUser({
  user: 'mengsblog_user',
  pwd: 'your_strong_password_here',
  roles: [
    { role: 'readWrite', db: 'mengsblog' }
  ]
});
"

# 10. 配置MongoDB安全设置
echo "🔒 配置MongoDB安全设置..."
cat > /etc/mongod.conf << EOF
# MongoDB配置文件

# 网络接口
net:
  port: 27017
  bindIp: 127.0.0.1  # 只允许本地连接

# 存储
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

# 系统日志
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

# 进程管理
processManagement:
  timeZoneInfo: /usr/share/zoneinfo

# 安全设置
security:
  authorization: enabled

# 操作日志
operationProfiling:
  slowOpThresholdMs: 100
  mode: slowOp
EOF

# 11. 重启MongoDB应用配置
echo "🔄 重启MongoDB应用配置..."
systemctl restart mongod

# 12. 创建备份脚本
echo "💾 创建备份脚本..."
cat > /usr/local/bin/backup-mongodb.sh << 'EOF'
#!/bin/bash
# MongoDB备份脚本

BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="mengsblog"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
mongodump --db $DB_NAME --out $BACKUP_DIR/$DATE

# 压缩备份文件
cd $BACKUP_DIR
tar -czf $DATE.tar.gz $DATE
rm -rf $DATE

# 删除7天前的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "MongoDB备份完成: $BACKUP_DIR/$DATE.tar.gz"
EOF

chmod +x /usr/local/bin/backup-mongodb.sh

# 13. 设置定时备份
echo "⏰ 设置定时备份..."
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-mongodb.sh") | crontab -

# 14. 创建监控脚本
echo "📊 创建监控脚本..."
cat > /usr/local/bin/mongodb-status.sh << 'EOF'
#!/bin/bash
# MongoDB状态检查脚本

echo "=== MongoDB状态检查 ==="
echo "服务状态:"
systemctl status mongod --no-pager | grep "Active:"

echo -e "\n连接测试:"
mongosh --eval "db.adminCommand('ping')" --quiet

echo -e "\n数据库列表:"
mongosh --eval "show dbs" --quiet

echo -e "\n当前连接数:"
mongosh --eval "db.serverStatus().connections" --quiet

echo -e "\n内存使用:"
mongosh --eval "db.serverStatus().mem" --quiet
EOF

chmod +x /usr/local/bin/mongodb-status.sh

echo "✅ MongoDB安装和配置完成！"
echo ""
echo "📋 重要信息："
echo "  - MongoDB服务已启动并设置开机自启"
echo "  - 数据库名: mengsblog"
echo "  - 用户名: mengsblog_user"
echo "  - 密码: your_strong_password_here (请修改)"
echo "  - 连接字符串: mongodb://mengsblog_user:your_strong_password_here@localhost:27017/mengsblog"
echo ""
echo "🔧 常用命令："
echo "  - 查看状态: systemctl status mongod"
echo "  - 重启服务: systemctl restart mongod"
echo "  - 查看日志: tail -f /var/log/mongodb/mongod.log"
echo "  - 连接数据库: mongosh"
echo "  - 状态检查: /usr/local/bin/mongodb-status.sh"
echo "  - 手动备份: /usr/local/bin/backup-mongodb.sh"
echo ""
echo "⚠️  安全提醒："
echo "  1. 请修改数据库用户密码"
echo "  2. 确保防火墙只开放必要端口"
echo "  3. 定期检查备份文件"
