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
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || '请求失败');
    return data;
  }).catch(e => {
    if (e.message === 'Failed to fetch' || e.message === 'NetworkError') {
      throw new Error('网络连接失败，请检查网络');
    }
    throw e;
  });
}

function esc(s) {
  if (s === null || s === undefined) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

function showFieldError(input, msg) {
  removeFieldError(input);
  input.style.borderColor = '#ef4444';
  const errEl = document.createElement('span');
  errEl.className = 'field-error';
  errEl.style.cssText = 'color:#ef4444;font-size:0.82rem;margin-top:4px;display:block;';
  errEl.textContent = msg;
  input.parentNode.appendChild(errEl);
}

function removeFieldError(input) {
  input.style.borderColor = '';
  const existing = input.parentNode.querySelector('.field-error');
  if (existing) existing.remove();
}

// ========== 首页：房源列表 & 搜索 ==========

const houseList = $('#house-list');
const searchForm = $('#search-form');
let isSearch = false;

if (houseList) {
  loadHeroCount();
  loadHouses();

  searchForm.addEventListener('submit', e => {
    e.preventDefault();
    isSearch = true;
    loadHouses();
  });
}

async function loadHeroCount() {
  try {
    const houses = await fetchJSON('/api/houses');
    const el = $('#hero-count');
    if (el) el.textContent = houses.length;
  } catch (_) {}
}

function getSearchParams() {
  const params = new URLSearchParams();
  const keyword = $('#s-keyword').value.trim();
  const min = $('#s-min').value;
  const max = $('#s-max').value;
  const layout = $('#s-layout').value;
  if (keyword) params.set('keyword', keyword);
  if (min && Number(min) >= 0) params.set('minPrice', min);
  if (max && Number(max) >= 0) params.set('maxPrice', max);
  if (layout) params.set('layout', layout);
  return params.toString();
}

async function loadHouses() {
  const query = searchForm ? getSearchParams() : '';
  const titleEl = $('#result-title');
  const countEl = $('#result-count');
  const emptyEl = $('#empty-state');

  try {
    const houses = await fetchJSON('/api/houses' + (query ? '?' + query : ''));
    if (titleEl) titleEl.textContent = query ? '搜索结果' : '全部房源';
    if (countEl) countEl.textContent = `共 ${houses.length} 套`;

    if (houses.length === 0) {
      houseList.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
    } else {
      if (emptyEl) emptyEl.style.display = 'none';

      houseList.innerHTML = houses.map(h => `
        <div class="house-card">
          <div class="card-body">
            <h3>${esc(h.title)}</h3>
            <div class="card-meta">
              <span class="price">${Number(h.price).toLocaleString()} 元/月</span>
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

    if (isSearch) {
      isSearch = false;
      const target = $('#results-section');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (e) {
    houseList.innerHTML = '';
    if (emptyEl) {
      emptyEl.style.display = 'block';
      emptyEl.innerHTML = '<p>加载失败：' + esc(e.message) + '</p>';
    }
  }
}

// ========== 详情页 ==========

const detailContent = $('#detail-content');

if (detailContent) {
  const id = new URLSearchParams(location.search).get('id');
  if (!id || isNaN(Number(id))) {
    detailContent.innerHTML = '<p style="color:#ef4444;">缺少有效的房源ID</p>';
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
        <div class="detail-price">${Number(h.price).toLocaleString()} 元/月 <span>(${esc(h.layout)} · ${h.area}㎡)</span></div>
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
    detailContent.innerHTML = `<p style="color:#ef4444;">${esc(e.message)}</p>`;
  }
}

// 预约表单
const appointForm = $('#appointment-form');
if (appointForm) {
  const dateInput = $('#a-date');
  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;

  [$('#a-name'), $('#a-phone'), $('#a-date')].forEach(input => {
    if (input) input.addEventListener('input', () => removeFieldError(input));
  });

  appointForm.addEventListener('submit', async e => {
    e.preventDefault();
    const nameInput = $('#a-name');
    const phoneInput = $('#a-phone');
    const dateInput2 = $('#a-date');
    let hasError = false;

    if (!nameInput.value.trim()) { showFieldError(nameInput, '请输入姓名'); hasError = true; }
    if (!phoneInput.value.trim()) { showFieldError(phoneInput, '请输入联系电话'); hasError = true; }
    else if (!/^1\d{10}$/.test(phoneInput.value.trim())) { showFieldError(phoneInput, '请输入正确的11位手机号'); hasError = true; }
    if (!dateInput2.value) { showFieldError(dateInput2, '请选择日期'); hasError = true; }
    if (hasError) return;

    const btn = appointForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = '提交中...';

    try {
      await fetchJSON('/api/appointments', {
        method: 'POST',
        body: {
          house_id: Number($('#a-house-id').value),
          name: nameInput.value.trim(),
          phone: phoneInput.value.trim(),
          message: $('#a-message').value.trim(),
          preferred_date: dateInput2.value,
        },
      });
      toast('预约成功！我们会尽快联系您');
      appointForm.reset();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '提交预约';
    }
  });
}

// ========== 登录页 ==========

const loginForm = $('#login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const msgEl = $('#login-msg');
    const btn = loginForm.querySelector('button[type="submit"]');
    const usernameInput = $('#l-username');
    const passwordInput = $('#l-password');

    if (!usernameInput.value.trim()) { showFieldError(usernameInput, '请输入用户名'); return; }
    if (!passwordInput.value) { showFieldError(passwordInput, '请输入密码'); return; }

    btn.disabled = true;
    btn.textContent = '登录中...';
    msgEl.style.display = 'none';

    try {
      await fetchJSON('/api/login', {
        method: 'POST',
        body: {
          username: usernameInput.value.trim(),
          password: passwordInput.value,
        },
      });
      location.href = 'admin.html';
    } catch (e) {
      msgEl.style.display = 'block';
      msgEl.className = 'msg error';
      msgEl.textContent = e.message;
    } finally {
      btn.disabled = false;
      btn.textContent = '登录';
    }
  });

  [$('#l-username'), $('#l-password')].forEach(input => {
    if (input) input.addEventListener('input', () => {
      removeFieldError(input);
      const msgEl = $('#login-msg');
      if (msgEl) msgEl.style.display = 'none';
    });
  });
}

// ========== 管理后台 ==========

const adminPage = $('.admin-page');
if (adminPage) {
  checkAdmin();
}

async function checkAdmin() {
  try {
    await fetchJSON('/api/me');
    initAdmin();
  } catch (e) {
    location.href = 'login.html';
  }
}

function initAdmin() {
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

  $('#logout-btn').addEventListener('click', async e => {
    e.preventDefault();
    try { await fetchJSON('/api/logout', { method: 'POST' }); } catch (_) {}
    location.href = 'login.html';
  });

  const houseForm = $('#house-form');
  const modal = $('#house-modal');

  $('#add-house-btn').addEventListener('click', () => {
    $('#modal-title').textContent = '添加房源';
    houseForm.reset();
    $$('#house-form .field-error').forEach(el => el.remove());
    $$('#house-form input, #house-form textarea, #house-form select').forEach(el => el.style.borderColor = '');
    $('#h-id').value = '';
    modal.style.display = 'flex';
  });

  $('#cancel-house').addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

  $$('#house-form input, #house-form textarea, #house-form select').forEach(input => {
    input.addEventListener('input', () => removeFieldError(input));
  });

  houseForm.addEventListener('submit', async e => {
    e.preventDefault();
    const requiredFields = [
      { id: 'h-title', label: '标题' },
      { id: 'h-price', label: '价格' },
      { id: 'h-area', label: '面积' },
      { id: 'h-address', label: '地址' },
      { id: 'h-desc', label: '描述' },
      { id: 'h-contact', label: '联系人' },
      { id: 'h-phone', label: '联系电话' },
    ];
    let hasError = false;
    for (const f of requiredFields) {
      const el = $(`#${f.id}`);
      if (!el.value.trim()) { showFieldError(el, `${f.label}不能为空`); hasError = true; }
    }
    const priceEl = $('#h-price');
    if (priceEl.value && Number(priceEl.value) <= 0) { showFieldError(priceEl, '价格必须大于0'); hasError = true; }
    const areaEl = $('#h-area');
    if (areaEl.value && Number(areaEl.value) <= 0) { showFieldError(areaEl, '面积必须大于0'); hasError = true; }
    if (hasError) return;

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
      if (e.message.includes('未登录') || e.message.includes('过期')) {
        toast('登录已过期，请重新登录', 'error');
        setTimeout(() => location.href = 'login.html', 1500);
      } else {
        toast(e.message, 'error');
      }
    }
  });
}

async function loadAdminHouses() {
  try {
    const houses = await fetchJSON('/api/houses');
    const tbody = $('#houses-table tbody');
    tbody.innerHTML = houses.map(h => `
      <tr>
        <td>${h.id}</td>
        <td>${esc(h.title)}</td>
        <td>${Number(h.price).toLocaleString()} 元</td>
        <td>${esc(h.layout)}</td>
        <td>${h.area}㎡</td>
        <td class="actions">
          <button class="btn btn-sm btn-secondary" onclick="editHouse(${h.id})">编辑</button>
          <button class="btn btn-danger" onclick="deleteHouse(${h.id})">删除</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    handleAdminError(e);
  }
}

async function editHouse(id) {
  try {
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
    $$('#house-form .field-error').forEach(el => el.remove());
    $$('#house-form input, #house-form textarea, #house-form select').forEach(el => el.style.borderColor = '');
    $('#house-modal').style.display = 'flex';
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteHouse(id) {
  if (!confirm('确定要删除这套房源吗？')) return;
  try {
    await fetchJSON(`/api/houses/${id}`, { method: 'DELETE' });
    toast('房源已删除');
    loadAdminHouses();
  } catch (e) {
    if (e.message.includes('未登录') || e.message.includes('过期')) {
      toast('登录已过期，请重新登录', 'error');
      setTimeout(() => location.href = 'login.html', 1500);
    } else {
      toast(e.message, 'error');
    }
  }
}

async function loadAppointments() {
  try {
    const list = await fetchJSON('/api/appointments/admin');
    const tbody = $('#appointments-table tbody');
    const statusMap = { pending: '待处理', confirmed: '已确认', rejected: '已拒绝' };
    tbody.innerHTML = list.map(a => `
      <tr>
        <td>${a.id}</td>
        <td>${esc(a.house_title || '(已删除)')}</td>
        <td>${esc(a.name)}</td>
        <td>${esc(a.phone)}</td>
        <td>${esc(a.preferred_date)}</td>
        <td><span class="status-badge status-${a.status}">${statusMap[a.status] || a.status}</span></td>
        <td class="actions">
          ${a.status === 'pending' ? `
            <button class="btn btn-sm btn-primary" onclick="updateAppointment(${a.id},'confirmed')">确认</button>
            <button class="btn btn-danger" onclick="updateAppointment(${a.id},'rejected')">拒绝</button>
          ` : '—'}
        </td>
      </tr>
    `).join('');
  } catch (e) {
    handleAdminError(e);
  }
}

async function updateAppointment(id, status) {
  try {
    await fetchJSON(`/api/appointments/${id}/status`, { method: 'PUT', body: { status } });
    toast('状态已更新');
    loadAppointments();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function loadUsers() {
  try {
    const users = await fetchJSON('/api/users');
    const tbody = $('#users-table tbody');
    const roleMap = { admin: '管理员' };
    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>${esc(u.username)}</td>
        <td>${roleMap[u.role] || u.role}</td>
        <td>${esc(u.created_at)}</td>
      </tr>
    `).join('');
  } catch (e) {
    handleAdminError(e);
  }
}

function handleAdminError(e) {
  if (e.message.includes('未登录') || e.message.includes('过期')) {
    toast('登录已过期，请重新登录', 'error');
    setTimeout(() => location.href = 'login.html', 1500);
  } else {
    toast(e.message, 'error');
  }
}
