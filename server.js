const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// ========== 工具函数 ==========

function parseCookies(req) {
  const cookies = {};
  const header = req.headers.cookie;
  if (!header) return cookies;
  header.split(';').forEach(c => {
    const eq = c.indexOf('=');
    if (eq === -1) return;
    const k = c.substring(0, eq).trim();
    cookies[k] = decodeURIComponent(c.substring(eq + 1).trim());
  });
  return cookies;
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// 认证中间件
function requireAuth(req, res, next) {
  const { token } = parseCookies(req);
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    const session = db.prepare(
      "SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')"
    ).get(token);
    if (!session) return res.status(401).json({ error: '登录已过期，请重新登录' });
    req.userId = session.user_id;
    next();
  } catch (e) {
    res.status(500).json({ error: '服务器错误' });
  }
}

// 输入校验
function validateString(val, label, maxLen) {
  if (typeof val !== 'string') return `${label}不能为空`;
  const trimmed = val.trim();
  if (!trimmed) return `${label}不能为空`;
  if (maxLen && trimmed.length > maxLen) return `${label}不能超过${maxLen}个字符`;
  return null;
}

function validateHouse(body) {
  const errors = [];
  let e;
  e = validateString(body.title, '标题', 100); if (e) errors.push(e);
  e = validateString(body.description, '描述', 2000); if (e) errors.push(e);
  if (!body.price || isNaN(Number(body.price)) || Number(body.price) <= 0) errors.push('价格必须大于0');
  e = validateString(body.layout, '户型', 20); if (e) errors.push(e);
  if (!body.area || isNaN(Number(body.area)) || Number(body.area) <= 0) errors.push('面积必须大于0');
  e = validateString(body.address, '地址', 200); if (e) errors.push(e);
  e = validateString(body.contact_name, '联系人', 50); if (e) errors.push(e);
  e = validateString(body.contact_phone, '联系电话', 20); if (e) errors.push(e);
  return errors;
}

function validateAppointment(body) {
  const errors = [];
  let e;
  if (!body.house_id || isNaN(Number(body.house_id))) {
    errors.push('房源不存在');
  }
  e = validateString(body.name, '姓名', 50); if (e) errors.push(e);
  e = validateString(body.phone, '联系电话', 20); if (e) errors.push(e);
  if (body.phone && !/^1\d{10}$/.test(body.phone.trim())) errors.push('请输入正确的手机号');
  if (!body.preferred_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.preferred_date)) {
    errors.push('请选择有效的日期');
  } else {
    const d = new Date(body.preferred_date);
    if (isNaN(d.getTime()) || d < new Date(new Date().toDateString())) {
      errors.push('看房日期不能早于今天');
    }
  }
  if (body.message && typeof body.message === 'string' && body.message.trim().length > 500) {
    errors.push('留言不能超过500字');
  }
  return errors;
}

// ========== 公开 API ==========

app.get('/api/houses', (req, res) => {
  try {
    const { keyword, minPrice, maxPrice, layout } = req.query;
    let sql = 'SELECT * FROM houses WHERE 1=1';
    const params = [];

    if (keyword && typeof keyword === 'string') {
      sql += ' AND (title LIKE ? OR address LIKE ? OR description LIKE ?)';
      const like = `%${keyword}%`;
      params.push(like, like, like);
    }
    if (minPrice && !isNaN(Number(minPrice))) {
      sql += ' AND price >= ?';
      params.push(Number(minPrice));
    }
    if (maxPrice && !isNaN(Number(maxPrice))) {
      sql += ' AND price <= ?';
      params.push(Number(maxPrice));
    }
    if (layout && typeof layout === 'string') {
      sql += ' AND layout = ?';
      params.push(layout);
    }

    const sortMap = { price_asc: 'price ASC', price_desc: 'price DESC', newest: 'created_at DESC' };
    const sort = sortMap[req.query.sort] || 'created_at DESC';
    sql += ` ORDER BY ${sort}`;

    const houses = db.prepare(sql).all(...params);
    res.json(houses);
  } catch (e) {
    console.error('获取房源失败:', e);
    res.status(500).json({ error: '获取房源失败，请稍后重试' });
  }
});

app.get('/api/houses/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: '无效的房源ID' });
    const house = db.prepare('SELECT * FROM houses WHERE id = ?').get(id);
    if (!house) return res.status(404).json({ error: '房源不存在' });
    res.json(house);
  } catch (e) {
    console.error('获取房源详情失败:', e);
    res.status(500).json({ error: '获取房源详情失败' });
  }
});

// ========== 登录 / 会话 ==========

app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    const uErr = validateString(username, '用户名', 50);
    if (uErr) return res.status(400).json({ error: uErr });
    if (!password) return res.status(400).json({ error: '密码不能为空' });

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, expiresAt);
    db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();

    res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`);
    res.json({ id: user.id, username: user.username, role: user.role });
  } catch (e) {
    console.error('登录失败:', e);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

app.post('/api/logout', (req, res) => {
  try {
    const { token } = parseCookies(req);
    if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    res.setHeader('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0');
    res.json({ message: '已退出' });
  } catch (e) {
    res.setHeader('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0');
    res.json({ message: '已退出' });
  }
});

app.get('/api/me', (req, res) => {
  try {
    const { token } = parseCookies(req);
    if (!token) return res.status(401).json({ error: '未登录' });
    const session = db.prepare(
      "SELECT s.user_id, u.username, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')"
    ).get(token);
    if (!session) return res.status(401).json({ error: '登录已过期' });
    res.json({ id: session.user_id, username: session.username, role: session.role });
  } catch (e) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 预约（公开） ==========

app.post('/api/appointments', (req, res) => {
  try {
    const errors = validateAppointment(req.body || {});
    if (errors.length > 0) return res.status(400).json({ error: errors.join('；') });

    const { house_id, name, phone, message, preferred_date } = req.body;
    const house = db.prepare('SELECT id FROM houses WHERE id = ?').get(Number(house_id));
    if (!house) return res.status(400).json({ error: '房源不存在' });

    const result = db.prepare(
      'INSERT INTO appointments (house_id, name, phone, message, preferred_date) VALUES (?, ?, ?, ?, ?)'
    ).run(Number(house_id), name.trim(), phone.trim(), (message || '').trim().substring(0, 500), preferred_date);
    res.json({ id: result.lastInsertRowid, message: '预约成功' });
  } catch (e) {
    console.error('提交预约失败:', e);
    res.status(500).json({ error: '提交预约失败，请稍后重试' });
  }
});

// ========== 以下接口需要登录 ==========

app.use('/api/houses', requireAuth);
app.use('/api/appointments/admin', requireAuth);
app.use('/api/users', requireAuth);

// 房源管理（需登录）
app.post('/api/houses', (req, res) => {
  try {
    const errors = validateHouse(req.body || {});
    if (errors.length > 0) return res.status(400).json({ error: errors.join('；') });

    const { title, description, price, layout, area, address, image, contact_name, contact_phone } = req.body;
    const result = db.prepare(
      'INSERT INTO houses (title, description, price, layout, area, address, image, contact_name, contact_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(title.trim(), description.trim(), Number(price), layout.trim(), Number(area), address.trim(), (image || '').trim().substring(0, 500), contact_name.trim(), contact_phone.trim());
    res.json({ id: result.lastInsertRowid, message: '添加成功' });
  } catch (e) {
    console.error('添加房源失败:', e);
    res.status(500).json({ error: '添加房源失败，请稍后重试' });
  }
});

app.put('/api/houses/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: '无效的房源ID' });
    const errors = validateHouse(req.body || {});
    if (errors.length > 0) return res.status(400).json({ error: errors.join('；') });

    const { title, description, price, layout, area, address, image, contact_name, contact_phone } = req.body;
    const existing = db.prepare('SELECT id FROM houses WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: '房源不存在' });

    db.prepare(
      'UPDATE houses SET title=?, description=?, price=?, layout=?, area=?, address=?, image=?, contact_name=?, contact_phone=? WHERE id=?'
    ).run(title.trim(), description.trim(), Number(price), layout.trim(), Number(area), address.trim(), (image || '').trim().substring(0, 500), contact_name.trim(), contact_phone.trim(), id);
    res.json({ message: '更新成功' });
  } catch (e) {
    console.error('更新房源失败:', e);
    res.status(500).json({ error: '更新房源失败，请稍后重试' });
  }
});

app.delete('/api/houses/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: '无效的房源ID' });
    db.prepare('DELETE FROM houses WHERE id = ?').run(id);
    res.json({ message: '删除成功' });
  } catch (e) {
    console.error('删除房源失败:', e);
    res.status(500).json({ error: '删除房源失败，请稍后重试' });
  }
});

// 预约管理（需登录）
app.get('/api/appointments/admin', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT a.*, h.title AS house_title
      FROM appointments a
      LEFT JOIN houses h ON a.house_id = h.id
      ORDER BY a.created_at DESC
    `).all();
    res.json(rows);
  } catch (e) {
    console.error('获取预约列表失败:', e);
    res.status(500).json({ error: '获取预约列表失败' });
  }
});

app.put('/api/appointments/:id/status', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: '无效的预约ID' });
    const { status } = req.body || {};
    if (!['confirmed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: '无效的状态' });
    }
    db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
    res.json({ message: '状态已更新' });
  } catch (e) {
    console.error('更新预约状态失败:', e);
    res.status(500).json({ error: '更新预约状态失败' });
  }
});

// 用户列表（需登录）
app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
  } catch (e) {
    console.error('获取用户列表失败:', e);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`租房网站已启动: http://localhost:${PORT}`);
  });
}

module.exports = app;
