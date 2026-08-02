let usersPage = 1;

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireRole('admin')) return;
  await loadAnalytics();
  initTabs();
  loadUsers();

  document.getElementById('user-search').addEventListener('input', debounce(() => { usersPage = 1; loadUsers(); }, 400));
  document.getElementById('user-role-filter').addEventListener('change', () => { usersPage = 1; loadUsers(); });
});

function initTabs() {
  document.querySelectorAll('.tabs .tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tabs .tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      ['users', 'jobs', 'events', 'messages'].forEach((t) => {
        document.getElementById(`tab-${t}`).style.display = t === tab ? 'block' : 'none';
      });
      if (tab === 'jobs') loadJobs();
      if (tab === 'events') loadEvents();
      if (tab === 'messages') loadMessages();
    });
  });
}

async function loadAnalytics() {
  try {
    const { data } = await apiRequest('/admin/analytics');
    document.getElementById('analytics-cards').innerHTML = `
      <div class="card stat-card"><div class="stat-icon green"><i class="fa-solid fa-users"></i></div><div><div class="stat-value">${data.totalUsers}</div><div class="stat-label">Total Users</div></div></div>
      <div class="card stat-card"><div class="stat-icon gold"><i class="fa-solid fa-user-graduate"></i></div><div><div class="stat-value">${data.totalStudents}</div><div class="stat-label">Students</div></div></div>
      <div class="card stat-card"><div class="stat-icon green"><i class="fa-solid fa-user-tie"></i></div><div><div class="stat-value">${data.totalAlumni}</div><div class="stat-label">Alumni</div></div></div>
      <div class="card stat-card"><div class="stat-icon gold"><i class="fa-solid fa-briefcase"></i></div><div><div class="stat-value">${data.totalJobs + data.totalInternships}</div><div class="stat-label">Jobs & Internships</div></div></div>
    `;

    new Chart(document.getElementById('signup-chart'), {
      type: 'line',
      data: {
        labels: data.signupTrend.map((s) => s.month),
        datasets: [{ label: 'New signups', data: data.signupTrend.map((s) => s.count), borderColor: '#223A63', backgroundColor: 'rgba(34,58,99,0.12)', fill: true, tension: 0.35 }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    new Chart(document.getElementById('industry-chart'), {
      type: 'bar',
      data: {
        labels: data.industryDistribution.map((i) => i.industry),
        datasets: [{ label: 'Alumni', data: data.industryDistribution.map((i) => i.count), backgroundColor: '#F0603C' }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  } catch (err) { showToast(err.message, 'error'); }
}

async function loadUsers() {
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = `<tr><td colspan="6"><div class="loading-state"><span class="spinner"></span></div></td></tr>`;
  const params = new URLSearchParams({
    search: document.getElementById('user-search').value,
    role: document.getElementById('user-role-filter').value,
    page: usersPage, limit: 10
  });
  try {
    const { data, pagination } = await apiRequest(`/admin/users?${params}`);
    tbody.innerHTML = data.length ? data.map((u) => `
      <tr>
        <td class="flex gap-1" style="align-items:center;">${avatarHtml(u)}${escapeHtml(u.full_name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td style="text-transform:capitalize;">${u.role}</td>
        <td>${formatDate(u.created_at)}</td>
        <td><span class="status-pill ${u.is_active ? 'active' : 'inactive'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
        <td class="row-actions">
          <button class="icon-btn" onclick="toggleStatus(${u.id}, ${u.is_active ? 0 : 1})" title="${u.is_active ? 'Deactivate' : 'Activate'}"><i class="fa-solid ${u.is_active ? 'fa-user-slash' : 'fa-user-check'}"></i></button>
          <button class="icon-btn danger" onclick="deleteUser(${u.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state">No users found.</div></td></tr>`;
    renderUsersPagination(pagination);
  } catch (err) { tbody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`; }
}
function renderUsersPagination(p) {
  const el = document.getElementById('users-pagination');
  if (p.totalPages <= 1) { el.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= p.totalPages; i++) html += `<button class="${i === p.page ? 'active' : ''}" onclick="changeUsersPage(${i})">${i}</button>`;
  el.innerHTML = html;
}
function changeUsersPage(page) { usersPage = page; loadUsers(); }

async function toggleStatus(id, is_active) {
  try {
    await apiRequest(`/admin/users/${id}/status`, { method: 'PUT', body: { is_active } });
    showToast('User status updated.', 'success');
    loadUsers();
  } catch (err) { showToast(err.message, 'error'); }
}
async function deleteUser(id) {
  if (!confirm('Permanently delete this user? This cannot be undone.')) return;
  try {
    await apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
    showToast('User deleted.', 'success');
    loadUsers();
  } catch (err) { showToast(err.message, 'error'); }
}

async function loadJobs() {
  const tbody = document.getElementById('jobs-tbody');
  tbody.innerHTML = `<tr><td colspan="5"><div class="loading-state"><span class="spinner"></span></div></td></tr>`;
  try {
    const { data } = await apiRequest('/admin/jobs');
    tbody.innerHTML = data.length ? data.map((j) => `
      <tr><td>${escapeHtml(j.title)}</td><td>${escapeHtml(j.company)}</td><td>${escapeHtml(j.posted_by_name)}</td><td><span class="status-pill ${j.status}">${j.status}</span></td><td>${formatDate(j.created_at)}</td></tr>
    `).join('') : `<tr><td colspan="5"><div class="empty-state">No jobs posted yet.</div></td></tr>`;
  } catch (err) { tbody.innerHTML = `<tr><td colspan="5">${err.message}</td></tr>`; }
}

async function loadEvents() {
  const tbody = document.getElementById('events-tbody');
  tbody.innerHTML = `<tr><td colspan="5"><div class="loading-state"><span class="spinner"></span></div></td></tr>`;
  try {
    const { data } = await apiRequest('/admin/events');
    tbody.innerHTML = data.length ? data.map((e) => `
      <tr><td>${escapeHtml(e.title)}</td><td>${e.event_type}</td><td>${escapeHtml(e.creator_name)}</td><td>${formatDate(e.event_date)}</td><td><span class="status-pill ${e.status}">${e.status}</span></td></tr>
    `).join('') : `<tr><td colspan="5"><div class="empty-state">No events created yet.</div></td></tr>`;
  } catch (err) { tbody.innerHTML = `<tr><td colspan="5">${err.message}</td></tr>`; }
}

async function loadMessages() {
  const tbody = document.getElementById('messages-tbody');
  tbody.innerHTML = `<tr><td colspan="5"><div class="loading-state"><span class="spinner"></span></div></td></tr>`;
  try {
    const { data } = await apiRequest('/admin/contact-messages');
    tbody.innerHTML = data.length ? data.map((m) => `
      <tr><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.email)}</td><td>${escapeHtml(m.subject || '—')}</td><td>${escapeHtml((m.message || '').slice(0,60))}</td><td>${formatDate(m.created_at)}</td></tr>
    `).join('') : `<tr><td colspan="5"><div class="empty-state">No contact messages yet.</div></td></tr>`;
  } catch (err) { tbody.innerHTML = `<tr><td colspan="5">${err.message}</td></tr>`; }
}
