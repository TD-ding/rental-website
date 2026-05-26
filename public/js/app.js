// ========== 工具函数 ==========

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function fetchJSON(url, options = {}) {
  return fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  }).then(r => r.json().then(data => {
    if (!r.ok) throw new Error(data.error || '请求失败');
    return data;
  }));
}

// ========== 首页：房源列表 & 搜索 ==========

const houseList = $('#house-list');
const searchForm = $('#search-form');

if (houseList) {
  loadHouses();

  searchForm.addEventListener('submit', e => {
    e.preventDefault();
    loadHouses();
  });
}

function getSearchParams() {
  const params = new URLSearchParams();
  const keyword = $('#s-keyword').value.trim();
  const min = $('#s-min').value;
  const max = $('#s-max').value;
  const layout = $('#s-layout').value;
  if (keyword) params.set('keyword', keyword);
  if (min) params.set('minPrice', min);
  if (max) params.set('maxPrice', max);
  if (layout) params.set('layout', layout);
  return params.toString();
}

async function loadHouses() {
  const query = searchForm ? getSearchParams() : '';
  const houses = await fetchJSON('/api/houses' + (query ? '?' + query : ''));
  const titleEl = $('#result-title');
  const countEl = $('#result-count');
  const emptyEl = $('#empty-state');

  if (titleEl) titleEl.textContent = query ? '搜索结果' : '全部房源';
  if (countEl) countEl.textContent = `共 ${houses.length} 套`;

  if (houses.length === 0) {
    houseList.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  houseList.innerHTML = houses.map(h => `
    <div class="house-card">
      <div class="card-body">
        <h3>${esc(h.title)}</h3>
        <div class="card-meta">
          <span class="price">${h.price} 元/月</span>
          <span>${esc(h.layout)}</span>
          <span class="area">${h.area}㎡</span>
        </div>
        <div class="card-addr">📍 ${esc(h.address)}</div>
      </div>
      <div class="card-footer">
        <a href="detail.html?id=${h.id}" class="btn btn-primary btn-sm">查看详情</a>
      </div>
    </div>
  `).join('');
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ========== 详情页 ==========

const detailContent = $('#detail-content');

if (detailContent) {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) {
    detailContent.innerHTML = '<p>缺少房源ID</p>';
  } else {
    loadDetail(id);
  }
}

async function loadDetail(id) {
  try {
    const h = await fetchJSON(`/api/houses/${id}`);
    $('#a-house-id').value = h.id;
    detailContent.innerHTML = `
      <div class="detail-card">
        <h1>${esc(h.title)}</h1>
        <div class="detail-price">${h.price} 元/月 <span>(${esc(h.layout)} · ${h.area}㎡)</span></div>
        <div class="detail-info">
          <div class="info-item"><label>户型</label><span>${esc(h.layout)}</span></div>
          <div class="info-item"><label>面积</label><span>${h.area} ㎡</span></div>
          <div class="info-item"><label>地址</label><span>${esc(h.address)}</span></div>
        </div>
        <div class="detail-desc">${esc(h.description)}</div>
        <div class="contact-box">
          <h3>联系方式</h3>
          <p>联系人：${esc(h.contact_name)}　　电话：${esc(h.contact_phone)}</p>
        </div>
      </div>
    `;
  } catch (e) {
    detailContent.innerHTML = `<p style="color:#ef4444;">${e.message}</p>`;
  }
}

// 预约表单
const appointForm = $('#appointment-form');
if (appointForm) {
  const dateInput = $('#a-date');
  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;

  appointForm.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await fetchJSON('/api/appointments', {
        method: 'POST',
        body: {
          house_id: Number($('#a-house-id').value),
          name: $('#a-name').value.trim(),
          phone: $('#a-phone').value.trim(),
          message: $('#a-message').value.trim(),
          preferred_date: $('#a-date').value,
        },
      });
      toast('预约成功！我们会尽快联系您');
      appointForm.reset();
    } catch (e) {
      toast(e.message, 'error');
    }
  });
}

// ========== 登录页 ==========

const loginForm = $('#login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const msgEl = $('#login-msg');
    try {
      const user = await fetchJSON('/api/login', {
        method: 'POST',
        body: {
          username: $('#l-username').value.trim(),
          password: $('#l-password').value,
        },
      });
      sessionStorage.setItem('admin', JSON.stringify(user));
      location.href = 'admin.html';
    } catch (e) {
      msgEl.style.display = 'block';
      msgEl.className = 'msg error';
      msgEl.textContent = e.message;
    }
  });
}

// ========== 管理后台 ==========

const adminPage = $('.admin-page');
if (adminPage) {
  const admin = JSON.parse(sessionStorage.getItem('admin') || 'null');
  if (!admin) {
    location.href = 'login.html';
  } else {
    initAdmin();
  }
}

function initAdmin() {
  // Tab 切换
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      $$('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      $(`#tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  loadAdminHouses();
  loadAppointments();
  loadUsers();

  // 退出登录
  $('#logout-btn').addEventListener('click', e => {
    e.preventDefault();
    sessionStorage.removeItem('admin');
    location.href = 'login.html';
  });

  // 房源表单
  const houseForm = $('#house-form');
  const modal = $('#house-modal');

  $('#add-house-btn').addEventListener('click', () => {
    $('#modal-title').textContent = '添加房源';
    houseForm.reset();
    $('#h-id').value = '';
    modal.style.display = 'flex';
  });

  $('#cancel-house').addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

  houseForm.addEventListener('submit', async e => {
    e.preventDefault();
    const body = {
      title: $('#h-title').value.trim(),
      description: $('#h-desc').value.trim(),
      price: Number($('#h-price').value),
      layout: $('#h-layout').value,
      area: Number($('#h-area').value),
      address: $('#h-address').value.trim(),
      image: $('#h-image').value.trim(),
      contact_name: $('#h-contact').value.trim(),
      contact_phone: $('#h-phone').value.trim(),
    };
    const id = $('#h-id').value;
    try {
      if (id) {
        await fetchJSON(`/api/houses/${id}`, { method: 'PUT', body });
        toast('房源已更新');
      } else {
        await fetchJSON('/api/houses', { method: 'POST', body });
        toast('房源已添加');
      }
      modal.style.display = 'none';
      loadAdminHouses();
    } catch (e) {
      toast(e.message, 'error');
    }
  });
}

async function loadAdminHouses() {
  const houses = await fetchJSON('/api/houses');
  const tbody = $('#houses-table tbody');
  tbody.innerHTML = houses.map(h => `
    <tr>
      <td>${h.id}</td>
      <td>${esc(h.title)}</td>
      <td>${h.price} 元</td>
      <td>${esc(h.layout)}</td>
      <td>${h.area}㎡</td>
      <td class="actions">
        <button class="btn btn-sm btn-secondary" onclick="editHouse(${h.id})">编辑</button>
        <button class="btn btn-danger" onclick="deleteHouse(${h.id})">删除</button>
      </td>
    </tr>
  `).join('');
}

async function editHouse(id) {
  const h = await fetchJSON(`/api/houses/${id}`);
  $('#h-id').value = h.id;
  $('#h-title').value = h.title;
  $('#h-desc').value = h.description;
  $('#h-price').value = h.price;
  $('#h-layout').value = h.layout;
  $('#h-area').value = h.area;
  $('#h-address').value = h.address;
  $('#h-image').value = h.image;
  $('#h-contact').value = h.contact_name;
  $('#h-phone').value = h.contact_phone;
  $('#modal-title').textContent = '编辑房源';
  $('#house-modal').style.display = 'flex';
}

async function deleteHouse(id) {
  if (!confirm('确定要删除这套房源吗？')) return;
  await fetchJSON(`/api/houses/${id}`, { method: 'DELETE' });
  toast('房源已删除');
  loadAdminHouses();
}

async function loadAppointments() {
  const list = await fetchJSON('/api/appointments');
  const tbody = $('#appointments-table tbody');
  const statusMap = { pending: '待处理', confirmed: '已确认', rejected: '已拒绝' };
  tbody.innerHTML = list.map(a => `
    <tr>
      <td>${a.id}</td>
      <td>${esc(a.house_title || '(已删除)')}</td>
      <td>${esc(a.name)}</td>
      <td>${esc(a.phone)}</td>
      <td>${a.preferred_date}</td>
      <td><span class="status-badge status-${a.status}">${statusMap[a.status] || a.status}</span></td>
      <td class="actions">
        ${a.status === 'pending' ? `
          <button class="btn btn-sm btn-primary" onclick="updateAppointment(${a.id},'confirmed')">确认</button>
          <button class="btn btn-danger" onclick="updateAppointment(${a.id},'rejected')">拒绝</button>
        ` : '—'}
      </td>
    </tr>
  `).join('');
}

async function updateAppointment(id, status) {
  await fetchJSON(`/api/appointments/${id}`, { method: 'PUT', body: { status } });
  toast('状态已更新');
  loadAppointments();
}

async function loadUsers() {
  const users = await fetchJSON('/api/users');
  const tbody = $('#users-table tbody');
  const roleMap = { admin: '管理员' };
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${u.id}</td>
      <td>${esc(u.username)}</td>
      <td>${roleMap[u.role] || u.role}</td>
      <td>${u.created_at}</td>
    </tr>
  `).join('');
}
