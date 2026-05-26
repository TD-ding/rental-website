# 好租房 - 租房网站

一个简单的前后端交互租房网站，支持房源浏览、预约看房和管理后台管理。

## 功能

- **前台首页**：房源卡片列表，支持关键词/价格/户型搜索和排序
- **收藏功能**：localStorage 持久化收藏
- **房源详情**：完整信息展示 + 在线预约看房
- **用户认证**：Cookie + 服务端 Session，登录状态持久化
- **管理后台**：房源增删改查、预约审核、用户列表、统计概览
- **响应式设计**：适配手机端

## 技术栈

- 后端：Node.js + Express 4 + SQLite (better-sqlite3)
- 前端：原生 HTML/CSS/JavaScript
- 认证：bcryptjs + httpOnly Cookie + 数据库 Session

## 快速开始

```bash
npm install
npm start
```

访问 http://localhost:3000，管理员：`admin` / `admin123`

## 开发

```bash
npm run lint    # ESLint 检查
npm test        # 运行测试
```

## Docker

```bash
docker compose up -d
```

## 开发过程

| 轮次 | 分支 | 类型 | 说明 |
|------|------|------|------|
| 1 | feat/round1-init | 初始版本 | 基础功能：前后端、房源CRUD、预约、登录 |
| 2 | refactor/round2-code-quality | 代码质量 | Session认证、输入校验、错误处理、XSS防护 |
| 3 | feat/round3-ux | 用户体验 | 搜索滚动、预约显眼、手机适配、Hero统计 |
| 4 | feat/round4-features | 功能增强 | 收藏、排序、管理统计 |

## 文档

- [前端文档](docs/frontend.md)
- [后端文档](docs/backend.md)
- [管理后台文档](docs/admin-frontend.md)
- [部署文档](docs/deployment.md)
