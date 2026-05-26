# 协作开发日志

## 项目：好租房网站

### 迭代记录

#### Round 1: feat/round1-init - 初始版本
- **模糊化输入**：想做一个租房网站，前台展示房源列表，可以搜索，详情页有联系方式和预约表单。后台管理能登录，管理房源、预约、用户。用 Node.js + Express + SQLite + 原生 HTML/CSS/JS。
- **改动**：Express 后端 + SQLite 数据库 + 前台首页 + 详情页 + 登录页 + 管理后台，10 条示例数据
- **PR**: #1

#### Round 2: refactor/round2-code-quality - 代码质量优化
- **模糊化输入**：管理后台接口谁都能调不安全，登录状态刷新就掉了，出错没提示，输入不验证，特殊字符有问题
- **改动**：sessions 表 + httpOnly cookie 认证、输入校验、try/catch 错误处理、esc() 增强
- **审查会话发现**：管理 API 无鉴权、无服务端会话、无错误处理、无输入验证、XSS 风险
- **PR**: #2

#### Round 3: feat/round3-ux - 用户体验优化
- **模糊化输入**：搜索结果出来不自动滚动、预约表单不显眼、手机端表格挤、搜索栏不好用、顶部图有点空
- **改动**：搜索自动滚动、预约区域虚线+蓝框更显眼、table-wrap 横向滚动、移动端搜索栏适配、Hero 统计数字
- **PR**: #3

#### Round 4: feat/round4-features - 功能增强
- **模糊化输入**：加收藏功能、管理统计、排序
- **改动**：localStorage 收藏、排序下拉（最新/价格升降）、管理后台统计卡片
- **PR**: #4

#### Step 4: lint + 测试 + Docker/CI
- ESLint flat config（按文件类型拆分）
- 12 个 Jest 单元测试（CRUD、登录、权限、验证）
- Dockerfile + docker-compose + CI workflow
- **lint**: 0 error, 15 warnings
- **test**: 12/12 passed

#### Step 5: 文档
- docs/frontend.md、docs/backend.md、docs/admin-frontend.md、docs/deployment.md
