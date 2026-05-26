const request = require('supertest');
const app = require('../server');

describe('租房网站 API', () => {
  // 公开接口
  test('GET /api/houses 返回房源列表', async () => {
    const res = await request(app).get('/api/houses');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('GET /api/houses 支持关键词搜索', async () => {
    const res = await request(app).get('/api/houses?keyword=花园');
    expect(res.status).toBe(200);
    res.body.forEach(h => {
      const text = h.title + h.address + h.description;
      expect(text).toContain('花园');
    });
  });

  test('GET /api/houses 支持价格筛选', async () => {
    const res = await request(app).get('/api/houses?minPrice=3000&maxPrice=5000');
    expect(res.status).toBe(200);
    res.body.forEach(h => {
      expect(h.price).toBeGreaterThanOrEqual(3000);
      expect(h.price).toBeLessThanOrEqual(5000);
    });
  });

  test('GET /api/houses/:id 返回房源详情', async () => {
    const res = await request(app).get('/api/houses/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body).toHaveProperty('title');
    expect(res.body).toHaveProperty('price');
  });

  test('GET /api/houses/999 返回 404', async () => {
    const res = await request(app).get('/api/houses/999');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  // 登录
  test('POST /api/login 正确密码登录成功', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('username', 'admin');
    expect(res.body).toHaveProperty('role', 'admin');
  });

  test('POST /api/login 错误密码返回 401', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('POST /api/login 空用户名返回 400', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: '', password: '123' });
    expect(res.status).toBe(400);
  });

  // 管理接口（未登录）
  test('POST /api/houses 未登录返回 401', async () => {
    const res = await request(app)
      .post('/api/houses')
      .send({ title: 'test', description: 'test', price: 1000, layout: '1室1厅', area: 50, address: 'test', contact_name: 't', contact_phone: '1' });
    expect(res.status).toBe(401);
  });

  test('GET /api/users 未登录返回 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  // 预约（公开）
  test('POST /api/appointments 缺少必填字段返回 400', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .send({ house_id: 1 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/appointments 无效手机号返回 400', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .send({ house_id: 1, name: '张三', phone: '123', preferred_date: '2099-01-01' });
    expect(res.status).toBe(400);
  });
});
