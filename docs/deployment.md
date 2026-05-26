# 部署文档

## 环境要求

- Node.js >= 18
- npm >= 8

## 本地开发

```bash
# 安装依赖
npm install

# 启动服务
npm start

# 运行 lint
npm run lint

# 运行测试
npm test
```

服务启动后访问 http://localhost:3000

## 环境变量

复制 `.env.example` 为 `.env` 并根据需要修改：

```
PORT=3000
```

## Docker 部署

```bash
# 构建并启动
docker compose up -d

# 查看日志
docker compose logs -f

# 停止
docker compose down
```

数据持久化：SQLite 数据文件存储在 Docker volume `db-data` 中。

## 生产部署注意事项

1. 数据库文件 `rental.db` 位于项目根目录，注意备份
2. Session 存储在 SQLite 中，重启不丢失但需定期清理过期记录
3. 默认管理员密码建议首次部署后修改
