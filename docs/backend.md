# 后端文档

## 技术栈

- Node.js + Express 4
- better-sqlite3（SQLite 数据库）
- bcryptjs（密码加密）

## API 端点

### 公开接口

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | `/api/houses` | 获取房源列表 | `keyword`, `minPrice`, `maxPrice`, `layout`, `sort` |
| GET | `/api/houses/:id` | 获取房源详情 | - |
| POST | `/api/appointments` | 提交预约 | `house_id`, `name`, `phone`, `preferred_date`, `message` |
| POST | `/api/login` | 登录 | `username`, `password` |
| POST | `/api/logout` | 退出登录 | - |
| GET | `/api/me` | 验证登录状态 | - |

### 需要登录的接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/houses` | 添加房源 |
| PUT | `/api/houses/:id` | 更新房源 |
| DELETE | `/api/houses/:id` | 删除房源 |
| GET | `/api/appointments/admin` | 获取预约列表 |
| PUT | `/api/appointments/:id/status` | 更新预约状态 |
| GET | `/api/users` | 获取用户列表 |

## 数据模型

### users
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增ID |
| username | TEXT UNIQUE | 用户名 |
| password | TEXT | bcrypt 加密密码 |
| role | TEXT | 角色（admin/user） |
| created_at | TEXT | 创建时间 |

### houses
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增ID |
| title | TEXT | 标题 |
| description | TEXT | 描述 |
| price | REAL | 月租价格 |
| layout | TEXT | 户型 |
| area | REAL | 面积㎡ |
| address | TEXT | 地址 |
| image | TEXT | 图片URL |
| contact_name | TEXT | 联系人 |
| contact_phone | TEXT | 联系电话 |
| created_at | TEXT | 创建时间 |

### appointments
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增ID |
| house_id | INTEGER FK | 关联房源 |
| name | TEXT | 预约人姓名 |
| phone | TEXT | 联系电话 |
| message | TEXT | 留言 |
| preferred_date | TEXT | 期望看房日期 |
| status | TEXT | 状态（pending/confirmed/rejected） |
| created_at | TEXT | 创建时间 |

### sessions
| 字段 | 类型 | 说明 |
|------|------|------|
| token | TEXT PK | 随机token |
| user_id | INTEGER FK | 关联用户 |
| expires_at | TEXT | 过期时间 |

## 认证机制

- 登录成功生成随机 token，写入 httpOnly cookie + 数据库 sessions 表
- Cookie 有效期 24 小时
- 管理接口通过 `requireAuth` 中间件验证 cookie 中的 token
- 过期 session 自动清理

## 输入验证

- `validateString()`: 非空 + 长度限制
- `validateHouse()`: 标题/描述/价格/户型/面积/地址/联系人/电话
- `validateAppointment()`: 房源ID/姓名/手机号格式(1开头11位)/日期格式/过去日期拒绝/留言长度

## 错误处理

- 所有路由 try/catch 包裹
- 错误时返回 500 + 友好提示
- 日志输出到 console.error
