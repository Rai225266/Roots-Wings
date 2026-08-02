let currentPage = 1;
const user = Auth.getUser();
let activeTab = 'browse';

document.addEventListener('DOMContentLoaded', () => {
  if (user.role === 'alumni' || user.role === 'admin') {
    document.getElementById('alumni-tabs').innerHTML = `<button class="tab-btn" data-tab="myposts">My Postings</button>`;
    document.getElementById('open-post').style.display = 'inline-flex';
    document.getElementById('open-post').addEventListener('click', () => openForm());
  }
  document.getElementById('intern-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    document.querySelectorAll('#intern-tabs .tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeTab = btn.dataset.tab;
    document.getElementById('tab-browse').style.display = activeTab === 'browse' ? 'block' : 'none';
    document.getElementById('tab-myposts').style.display = activeTab === 'myposts' ? 'block' : 'none';
    if (activeTab === 'myposts') loadMyPosts();
  });

  loadInternships();
  document.getElementById('search-input').addEventListener('input', debounce(() => { currentPage = 1; loadInternships(); }, 400));
  document.getElementById('filter-mode').addEventListener('change', () => { currentPage = 1; loadInternships(); });
  document.getElementById('filter-location').addEventListener('input', debounce(() => { currentPage = 1; loadInternships(); }, 400));

  document.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.remove('open')));
  document.querySelectorAll('.modal-overlay').forEach((overlay) => overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); }));
  document.getElementById('intern-form').addEventListener('submit', submitForm);
  document.getElementById('apply-form').addEventListener('submit', submitApplication);
});

async function loadInternships() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '<div class="loading-state"><span class="spinner"></span>Loading internships...</div>';
  const params = new URLSearchParams({
    search: document.getElementById('search-input').value,
    mode: document.getElementById('filter-mode').value,
    location: document.getElementById('filter-location').value,
    page: currentPage, limit: 9
  });
  try {
    const { data, pagination } = await apiRequest(`/internships?${params}`);
    grid.innerHTML = data.length ? data.map(renderCard).join('') : `<div class="empty-state" style="grid-column:1/-1;"><i class="fa-solid fa-laptop-code"></i><p>No internships match your search.</p></div>`;
    renderPagination(pagination);
  } catch (err) { grid.innerHTML = `<div class="empty-state">${err.message}</div>`; }
}

function renderCard(i) {
  const skills = (i.skills_required || '').split(',').filter(Boolean).slice(0, 3);
  return `
    <div class="card job-card reveal in-view">
      <div class="job-top"><div class="job-logo">${escapeHtml(i.company[0])}</div><div><h3>${escapeHtml(i.title)}</h3><p class="text-soft" style="font-size:0.85rem;">${escapeHtml(i.company)}</p></div></div>
      <div class="job-meta"><span><i class="fa-solid fa-location-dot"></i>${escapeHtml(i.location || i.mode)}</span><span><i class="fa-solid fa-clock"></i>${escapeHtml(i.duration || '')}</span></div>
      <div class="tags">${skills.map((s) => `<span class="badge">${escapeHtml(s.trim())}</span>`).join('')}</div>
      <div class="job-footer"><span class="text-soft" style="font-size:0.8rem;">${i.stipend || 'Unpaid'}</span><button class="btn btn-outline btn-sm" onclick="viewDetail(${i.id})">View Details</button></div>
    </div>`;
}

async function viewDetail(id) {
  const modal = document.getElementById('detail-modal');
  const body = document.getElementById('detail-body');
  modal.classList.add('open');
  body.innerHTML = '<div class="loading-state"><span class="spinner"></span></div>';
  try {
    const { data: i } = await apiRequest(`/internships/${id}`);
    const skills = (i.skills_required || '').split(',').filter(Boolean);
    body.innerHTML = `
      <span class="badge-gold badge mb-2">${i.mode}</span>
      <h2 style="font-size:1.3rem;">${escapeHtml(i.title)}</h2>
      <p class="text-soft mb-2">${escapeHtml(i.company)} · ${escapeHtml(i.location || '')} · Posted by ${escapeHtml(i.posted_by_name)}</p>
      <div class="grid grid-2 mb-2">
        <div><strong style="font-size:0.8rem;">Duration</strong><p class="text-soft" style="font-size:0.85rem;">${i.duration || '—'}</p></div>
        <div><strong style="font-size:0.8rem;">Stipend</strong><p class="text-soft" style="font-size:0.85rem;">${i.stipend || '—'}</p></div>
      </div>
      <p class="mb-2">${escapeHtml(i.description)}</p>
      <div class="tags mb-3">${skills.map((s) => `<span class="badge">${escapeHtml(s.trim())}</span>`).join('')}</div>
      ${user.role === 'student' ? `
        <div class="flex gap-1">
          <button class="btn btn-primary btn-block" onclick="openApply(${i.id})">Apply Now</button>
          <button class="btn btn-outline btn-block" onclick="toggleSave(${i.id})"><i class="fa-solid fa-bookmark"></i> Save</button>
        </div>` : ''}
    `;
  } catch (err) { body.innerHTML = `<div class="empty-state">${err.message}</div>`; }
}

function openApply(id) {
  document.getElementById('detail-modal').classList.remove('open');
  document.querySelector('#apply-form [name="internship_id"]').value = id;
  document.getElementById('apply-modal').classList.add('open');
}
async function submitApplication(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const id = formData.get('internship_id');
  try {
    await apiRequest(`/internships/${id}/apply`, { method: 'POST', body: { cover_note: formData.get('cover_note') } });
    showToast('Application submitted!', 'success');
    document.getElementById('apply-modal').classList.remove('open');
    e.target.reset();
  } catch (err) { showToast(err.message, 'error'); }
}
async function toggleSave(id) {
  try {
    const res = await apiRequest(`/internships/${id}/save`, { method: 'POST' });
    showToast(res.message, 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

async function loadMyPosts() {
  const tbody = document.getElementById('myposts-tbody');
  tbody.innerHTML = `<tr><td colspan="5"><div class="loading-state"><span class="spinner"></span></div></td></tr>`;
  try {
    const { data } = await apiRequest('/internships/my/posted');
    tbody.innerHTML = data.length ? data.map((i) => `
      <tr>
        <td>${escapeHtml(i.title)}</td><td>${escapeHtml(i.company)}</td><td>${formatDate(i.created_at)}</td>
        <td><span class="status-pill ${i.status}">${i.status}</span></td>
        <td class="row-actions">
          <button class="icon-btn" title="View Applicants" onclick="viewApplicants(${i.id}, '${escapeHtml(i.title).replace(/'/g, "\\'")}')"><i class="fa-solid fa-users"></i></button>
          <button class="icon-btn" title="Edit" onclick='openForm(${JSON.stringify(i)})'><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn danger" title="Delete" onclick="deleteInternship(${i.id})"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`).join('') : `<tr><td colspan="5"><div class="empty-state">No internships posted yet.</div></td></tr>`;
  } catch (err) { tbody.innerHTML = `<tr><td colspan="5">${err.message}</td></tr>`; }
}

async function viewApplicants(internshipId, title) {
  const modal = document.getElementById('applicants-modal');
  const body = document.getElementById('applicants-body');
  document.getElementById('applicants-title').textContent = `Applicants — ${title}`;
  modal.classList.add('open');
  body.innerHTML = '<div class="loading-state"><span class="spinner"></span></div>';
  try {
    const { data } = await apiRequest(`/applications/internship/${internshipId}`);
    body.innerHTML = data.length ? data.map((a) => `
      <div class="card mb-2" style="padding:14px;">
        <div class="flex gap-2" style="align-items:center;">
          ${avatarHtml(a)}
          <div style="flex:1; min-width:0;">
            <strong style="font-size:0.9rem;">${escapeHtml(a.full_name)}</strong>
            <p class="text-soft" style="font-size:0.78rem;">${escapeHtml(a.university || '')}${a.graduation_year ? ' · ' + a.graduation_year : ''}</p>
          </div>
          <select class="form-control" style="width:auto; padding:6px 10px; font-size:0.8rem;" onchange="updateApplicantStatus(${a.application_id}, this.value)">
            ${['applied','under_review','shortlisted','interview','selected','rejected'].map((s) => `<option value="${s}" ${a.status === s ? 'selected' : ''}>${s.replace('_',' ')}</option>`).join('')}
          </select>
        </div>
        ${a.cover_note ? `<p class="text-soft mt-2" style="font-size:0.82rem;">"${escapeHtml(a.cover_note)}"</p>` : ''}
        <div class="flex gap-1 mt-2">
          <a href="/messages.html?to=${a.user_id}" class="btn btn-outline btn-sm" style="flex:1;"><i class="fa-solid fa-comment"></i> Message</a>
          ${a.resume_url ? `<a href="${a.resume_url}" target="_blank" class="btn btn-outline btn-sm" style="flex:1;"><i class="fa-solid fa-file"></i> Resume</a>` : ''}
        </div>
      </div>`).join('') : '<div class="empty-state">No applicants yet.</div>';
  } catch (err) { body.innerHTML = `<div class="empty-state">${err.message}</div>`; }
}
async function updateApplicantStatus(applicationId, status) {
  try {
    await apiRequest(`/applications/${applicationId}/status`, { method: 'PUT', body: { status } });
    showToast('Applicant status updated.', 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

function openForm(item = null) {
  const form = document.getElementById('intern-form');
  form.reset();
  document.getElementById('form-title').textContent = item ? 'Edit Internship' : 'Post an Internship';
  form.internship_id.value = item?.id || '';
  if (item) {
    form.title.value = item.title; form.company.value = item.company; form.location.value = item.location || '';
    form.mode.value = item.mode; form.duration.value = item.duration || ''; form.stipend.value = item.stipend || '';
    form.description.value = item.description; form.skills_required.value = item.skills_required || '';
    form.last_date_to_apply.value = item.last_date_to_apply || '';
  }
  document.getElementById('form-modal').classList.add('open');
}
async function submitForm(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const id = formData.get('internship_id');
  const payload = Object.fromEntries(formData);
  delete payload.internship_id;
  try {
    if (id) await apiRequest(`/internships/${id}`, { method: 'PUT', body: payload });
    else await apiRequest('/internships', { method: 'POST', body: payload });
    showToast(id ? 'Internship updated!' : 'Internship posted!', 'success');
    document.getElementById('form-modal').classList.remove('open');
    if (activeTab === 'myposts') loadMyPosts(); else loadInternships();
  } catch (err) { showToast(err.message, 'error'); }
}
async function deleteInternship(id) {
  if (!confirm('Delete this internship posting?')) return;
  try {
    await apiRequest(`/internships/${id}`, { method: 'DELETE' });
    showToast('Internship deleted.', 'success');
    loadMyPosts();
  } catch (err) { showToast(err.message, 'error'); }
}

function renderPagination(p) {
  const el = document.getElementById('pagination');
  if (p.totalPages <= 1) { el.innerHTML = ''; return; }
  let html = `<button ${p.page === 1 ? 'disabled' : ''} onclick="changePage(${p.page - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;
  for (let i = 1; i <= p.totalPages; i++) html += `<button class="${i === p.page ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
  html += `<button ${p.page === p.totalPages ? 'disabled' : ''} onclick="changePage(${p.page + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;
  el.innerHTML = html;
}
function changePage(page) { currentPage = page; loadInternships(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
