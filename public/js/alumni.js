let currentPage = 1;
const user = Auth.getUser();

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const presetSearch = params.get('search');
  if (presetSearch) document.getElementById('search-input').value = presetSearch;

  loadFilterOptions();
  loadAlumni();

  document.getElementById('search-input').addEventListener('input', debounce(() => { currentPage = 1; loadAlumni(); }, 400));
  ['filter-university', 'filter-company', 'filter-industry', 'filter-year'].forEach((id) => {
    document.getElementById(id).addEventListener('change', () => { currentPage = 1; loadAlumni(); });
  });

  document.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.remove('open')));
  document.querySelectorAll('.modal-overlay').forEach((overlay) => overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); }));

  document.getElementById('mentor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await apiRequest('/mentorship/request', { method: 'POST', body: Object.fromEntries(formData) });
      showToast('Mentorship request sent!', 'success');
      document.getElementById('mentor-modal').classList.remove('open');
      e.target.reset();
    } catch (err) { showToast(err.message, 'error'); }
  });
});

async function loadFilterOptions() {
  try {
    const { data } = await apiRequest('/alumni/filters/options');
    fillSelect('filter-university', data.universities);
    fillSelect('filter-company', data.companies);
    fillSelect('filter-industry', data.industries);
    fillSelect('filter-year', data.years);
  } catch (err) { /* ignore */ }
}
function fillSelect(id, values) {
  const select = document.getElementById(id);
  values.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = v;
    select.appendChild(opt);
  });
}

async function loadAlumni() {
  const grid = document.getElementById('alumni-grid');
  grid.innerHTML = '<div class="loading-state"><span class="spinner"></span>Loading alumni...</div>';
  const params = new URLSearchParams({
    search: document.getElementById('search-input').value,
    university: document.getElementById('filter-university').value,
    company: document.getElementById('filter-company').value,
    industry: document.getElementById('filter-industry').value,
    graduation_year: document.getElementById('filter-year').value,
    page: currentPage, limit: 9
  });
  try {
    const { data, pagination } = await apiRequest(`/alumni?${params}`);
    grid.innerHTML = data.length ? data.map(renderAlumniCard).join('') : `<div class="empty-state" style="grid-column:1/-1;"><i class="fa-solid fa-user-slash"></i><p>No alumni match your filters.</p></div>`;
    renderPagination(pagination);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">${err.message}</div>`;
  }
}

function renderAlumniCard(a) {
  const skills = (a.skills || '').split(',').filter(Boolean).slice(0, 3);
  return `
    <div class="card person-card reveal in-view">
      ${avatarHtml(a, 'avatar-lg')}
      <h3>${escapeHtml(a.full_name)}</h3>
      <p class="role">${escapeHtml(a.designation || '')}${a.current_company ? ' at ' + escapeHtml(a.current_company) : ''}</p>
      <p class="text-soft" style="font-size:0.8rem;">${escapeHtml(a.university || '')} ${a.graduation_year ? '· Class of ' + a.graduation_year : ''}</p>
      <div class="tags">${skills.map((s) => `<span class="badge">${escapeHtml(s.trim())}</span>`).join('')}</div>
      <div class="flex gap-1 mt-2">
        <button class="btn btn-outline btn-sm" style="flex:1;" onclick="viewProfile(${a.id})">View Profile</button>
        ${user.role === 'student' ? `<button class="btn btn-primary btn-sm" style="flex:1;" onclick="openMentorModal(${a.id}, '${escapeHtml(a.full_name)}')">Request Mentor</button>` : ''}
      </div>
    </div>`;
}

function openMentorModal(id, name) {
  document.getElementById('mentor-alumni-id').value = id;
  document.getElementById('mentor-modal-name').textContent = `To: ${name}`;
  document.getElementById('mentor-modal').classList.add('open');
}

async function viewProfile(id) {
  const modal = document.getElementById('profile-modal');
  const body = document.getElementById('profile-modal-body');
  modal.classList.add('open');
  body.innerHTML = '<div class="loading-state"><span class="spinner"></span></div>';
  try {
    const { data } = await apiRequest(`/alumni/${id}`);
    const skills = (data.skills || '').split(',').filter(Boolean);
    body.innerHTML = `
      <div class="text-center mb-3">${avatarHtml(data, 'avatar-lg')}<h2 class="mt-2" style="font-size:1.3rem;">${escapeHtml(data.full_name)}</h2>
        <p class="text-soft">${escapeHtml(data.designation || '')}${data.current_company ? ' at ' + escapeHtml(data.current_company) : ''}</p></div>
      <p class="mb-2">${escapeHtml(data.bio || 'No bio provided yet.')}</p>
      <div class="grid grid-2 mb-2">
        <div><strong style="font-size:0.8rem;">University</strong><p class="text-soft" style="font-size:0.85rem;">${escapeHtml(data.university || '—')}</p></div>
        <div><strong style="font-size:0.8rem;">Graduation Year</strong><p class="text-soft" style="font-size:0.85rem;">${data.graduation_year || '—'}</p></div>
        <div><strong style="font-size:0.8rem;">Industry</strong><p class="text-soft" style="font-size:0.85rem;">${escapeHtml(data.industry || '—')}</p></div>
        <div><strong style="font-size:0.8rem;">Experience</strong><p class="text-soft" style="font-size:0.85rem;">${data.years_experience || 0} years</p></div>
      </div>
      <div class="tags mb-3">${skills.map((s) => `<span class="badge">${escapeHtml(s.trim())}</span>`).join('')}</div>
      ${data.experience?.length ? `<h4 style="font-size:0.95rem;" class="mb-2">Experience</h4>` + data.experience.map((e) => `
        <div class="timeline-item"><strong style="font-size:0.88rem;">${escapeHtml(e.title)}</strong><p class="text-soft" style="font-size:0.8rem;">${escapeHtml(e.company)}</p></div>
      `).join('') : ''}
      <div class="flex gap-1 mt-3">
        <a href="/messages.html?to=${data.id}" class="btn btn-outline btn-block"><i class="fa-solid fa-comment"></i> Message</a>
        ${user.role === 'student' ? `<button class="btn btn-primary btn-block" onclick="document.getElementById('profile-modal').classList.remove('open'); openMentorModal(${data.id}, '${escapeHtml(data.full_name)}')">Request Mentor</button>` : ''}
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

function renderPagination(p) {
  const el = document.getElementById('pagination');
  if (p.totalPages <= 1) { el.innerHTML = ''; return; }
  let html = `<button ${p.page === 1 ? 'disabled' : ''} onclick="changePage(${p.page - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;
  for (let i = 1; i <= p.totalPages; i++) {
    html += `<button class="${i === p.page ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
  }
  html += `<button ${p.page === p.totalPages ? 'disabled' : ''} onclick="changePage(${p.page + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;
  el.innerHTML = html;
}
function changePage(page) { currentPage = page; loadAlumni(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
