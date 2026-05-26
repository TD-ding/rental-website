const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// ========== 房源 API ==========

app.get('/api/houses', (req, res) => {
  const { keyword, minPrice, maxPrice, layout } = req.query;
  let sql = 'SELECT * FROM houses WHERE 1=1';
  const params = [];

  if (keyword) {
    sql += ' AND (title LIKE ? OR address LIKE ? OR description LIKE ?)';
    const like = `%${keyword}%`;
    params.push(like, like, like);
  }
  if (minPrice) {
    sql += ' AND price >= ?';
    params.push(Number(minPrice));
  }
  if (maxPrice) {
    sql += ' AND price <= ?';
    params.push(Number(maxPrice));
  }
  if (layout) {
    sql += ' AND layout = ?';
    params.push(layout);
  }

  sql += ' ORDER BY created_at DESC';
  const houses = db.prepare(sql).all(...params);
  res.json(houses);
});

app.get('/api/houses/:id', (req, res) => {
  const house = db.prepare('SELECT * FROM houses WHERE id = ?').get(req.params.id);
  if (!house) return res.status(404).json({ error: '房源不存在' });
  res.json(house);
});

app.post('/api/houses', (req, res) => {
  const { title, description, price, layout, area, address, image, contact_name, contact_phone } = req.body;
  const result = db.prepare(
    'INSERT INTO houses (title, description, price, layout, area, address, image, contact_name, contact_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(title, description, price, layout, area, address, image || '', contact_name, contact_phone);
  res.json({ id: result.lastInsertRowid, message: '添加成功' });
});

app.put('/api/houses/:id', (req, res) => {
  const { title, description, price, layout, area, address, image, contact_name, contact_phone } = req.body;
  db.prepare(
    'UPDATE houses SET title=?, description=?, price=?, layout=?, area=?, address=?, image=?, contact_name=?, contact_phone=? WHERE id=?'
  ).run(title, description, price, layout, area, address, image || '', contact_name, contact_phone, req.params.id);
  res.json({ message: '更新成功' });
});

app.delete('/api/houses/:id', (req, res) => {
  db.prepare('DELETE FROM houses WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

// ========== 预约 API ==========

app.post('/api/appointments', (req, res) => {
  const { house_id, name, phone, message, preferred_date } = req.body;
  const result = db.prepare(
    'INSERT INTO appointments (house_id, name, phone, message, preferred_date) VALUES (?, ?, ?, ?, ?)'
  ).run(house_id, name, phone, message || '', preferred_date);
  res.json({ id: result.lastInsertRowid, message: '预约成功' });
});

app.get('/api/appointments', (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, h.title AS house_title
    FROM appointments a
    LEFT JOIN houses h ON a.house_id = h.id
    ORDER BY a.created_at DESC
  `).all();
  res.json(rows);
});

app.put('/api/appointments/:id', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: '状态已更新' });
});

// ========== 用户 API ==========

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  res.json({ id: user.id, username: user.username, role: user.role });
});

app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

app.listen(PORT, () => {
  console.log(`租房网站已启动: http://localhost:${PORT}`);
});
