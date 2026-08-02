let currentPage = 1;
const user = Auth.getUser();
let activeTab = 'browse';

document.addEventListener('DOMContentLoaded', () => {
  setupTabsForRole();
  loadJobs();

  const params = new URLSearchParams(window.location.search);
  const presetTab = params.get('tab');
  if (presetTab) {
    const btn = document.querySelector(`.tab-btn[data-tab="${presetTab}"]`);
    if (btn) btn.click();
  }

  document.getElementById('search-input').addEventListener('input', debounce(() => { currentPage = 1; loadJobs(); }, 400));
  document.getElementById('filter-type').addEventListener('change', () => { currentPage = 1; loadJobs(); });
  document.getElementById('filter-location').addEventListener('input', debounce(() => { currentPage = 1; loadJobs(); }, 400));

  document.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.remove('open')));
  document.querySelectorAll('.modal-overlay').forEach((overlay) => overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); }));

  if (user.role === 'alumni' || user.role === 'admin') {
    document.getElementById('open-post-job').style.display = 'inline-flex';
    document.getElementById('open-post-job').addEventListener('click', () => openJobForm());
  }

  document.getElementById('job-form').addEventListener('submit', submitJobForm);
  document.getElementById('apply-form').addEventListener('submit', submitApplication);
});

function setupTabsForRole() {
  const tabsBar = document.getElementById('job-tabs');
  if (user.role === 'student') {
    document.getElementById('student-tabs').innerHTML = `
      <button class="tab-btn" data-tab="applications">My Applications</button>
      <button class="tab-btn" data-tab="saved">Saved Jobs</button>`;
  } else if (user.role === 'alumni' || user.role === 'admin') {
    document.getElementById('alumni-tabs').innerHTML = `<button class="tab-btn" data-tab="myjobs">My Postings</button>`;
  }
  tabsBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    tabsBar.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeTab = btn.dataset.tab;
    ['browse', 'applications', 'saved', 'myjobs'].forEach((t) => {
      const el = document.getElementById(`tab-${t}`);
      if (el) el.style.display = t === activeTab ? 'block' : 'none';
    });
    if (activeTab === 'applications') loadApplications();
    if (activeTab === 'saved') loadSaved();
    if (activeTab === 'myjobs') loadMyJobs();
  });
}

async function loadJobs() {
  const grid = document.getElementById('jobs-grid');
  grid.innerHTML = '<div class="loading-state"><span class="spinner"></span>Loading jobs...</div>';
  const params = new URLSearchParams({
    search: document.getElementById('search-input').value,
    job_type: document.getElementById('filter-type').value,
    location: document.getElementById('filter-location').value,
    page: currentPage, limit: 9
  });
  try {
    const { data, pagination } = await apiRequest(`/jobs?${params}`);
    grid.innerHTML = data.length ? data.map(renderJobCard).join('') : `<div class="empty-state" style="grid-column:1/-1;"><i class="fa-solid fa-briefcase"></i><p>No jobs match your search.</p></div>`;
    renderPagination(pagination);
  } catch (err) { grid.innerHTML = `<div class="empty-state">${err.message}</div>`; }
}

function renderJobCard(j) {
  const skills = (j.skills_required || '').split(',').filter(Boolean).slice(0, 3);
  return `
    <div class="card job-card reveal in-view">
      <div class="job-top"><div class="job-logo">${escapeHtml(j.company[0])}</div><div><h3>${escapeHtml(j.title)}</h3><p class="text-soft" style="font-size:0.85rem;">${escapeHtml(j.company)}</p></div></div>
      <div class="job-meta">
        <span><i class="fa-solid fa-location-dot"></i>${escapeHtml(j.location || 'Remote')}</span>
        <span><i class="fa-solid fa-briefcase"></i>${j.job_type}</span>
      </div>
      <div class="tags">${skills.map((s) => `<span class="badge">${escapeHtml(s.trim())}</span>`).join('')}</div>
      <div class="job-footer">
        <span class="text-soft" style="font-size:0.8rem;">${j.salary_range || 'Not disclosed'}</span>
        <button class="btn btn-outline btn-sm" onclick="viewJob(${j.id})">View Details</button>
      </div>
    </div>`;
}

async function viewJob(id) {
  const modal = document.getElementById('job-detail-modal');
  const body = document.getElementById('job-detail-body');
  modal.classList.add('open');
  body.innerHTML = '<div class="loading-state"><span class="spinner"></span></div>';
  try {
    const { data: j } = await apiRequest(`/jobs/${id}`);
    const skills = (j.skills_required || '').split(',').filter(Boolean);
    body.innerHTML = `
      <span class="badge mb-2">${j.job_type}</span>
      <h2 style="font-size:1.3rem;">${escapeHtml(j.title)}</h2>
      <p class="text-soft mb-2">${escapeHtml(j.company)} · ${escapeHtml(j.location || 'Remote')} · Posted by ${escapeHtml(j.posted_by_name)}</p>
      <div class="grid grid-2 mb-2">
        <div><strong style="font-size:0.8rem;">Experience</strong><p class="text-soft" style="font-size:0.85rem;">${j.experience_required || '—'}</p></div>
        <div><strong style="font-size:0.8rem;">Salary</strong><p class="text-soft" style="font-size:0.85rem;">${j.salary_range || '—'}</p></div>
      </div>
      <p class="mb-2">${escapeHtml(j.description)}</p>
      ${j.requirements ? `<h4 style="font-size:0.9rem;">Requirements</h4><p class="text-soft mb-2">${escapeHtml(j.requirements)}</p>` : ''}
      <div class="tags mb-3">${skills.map((s) => `<span class="badge">${escapeHtml(s.trim())}</span>`).join('')}</div>
      ${user.role === 'student' ? `
        <div class="flex gap-1">
          <button class="btn btn-primary btn-block" onclick="openApplyModal(${j.id})">Apply Now</button>
          <button class="btn btn-outline btn-block" onclick="toggleSave(${j.id})"><i class="fa-solid fa-bookmark"></i> Save</button>
        </div>` : ''}
    `;
  } catch (err) { body.innerHTML = `<div class="empty-state">${err.message}</div>`; }
}

function openApplyModal(jobId) {
  document.getElementById('job-detail-modal').classList.remove('open');
  document.querySelector('#apply-form [name="job_id"]').value = jobId;
  document.getElementById('apply-modal').classList.add('open');
}
async function submitApplication(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const jobId = formData.get('job_id');
  try {
    await apiRequest(`/jobs/${jobId}/apply`, { method: 'POST', body: { cover_note: formData.get('cover_note') } });
    showToast('Application submitted!', 'success');
    document.getElementById('apply-modal').classList.remove('open');
    e.target.reset();
  } catch (err) { showToast(err.message, 'error'); }
}
async function toggleSave(jobId) {
  try {
    const res = await apiRequest(`/jobs/${jobId}/save`, { method: 'POST' });
    showToast(res.message, 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

async function loadApplications() {
  const tbody = document.querySelector('#applications-table tbody');
  tbody.innerHTML = `<tr><td colspan="4"><div class="loading-state"><span class="spinner"></span></div></td></tr>`;
  try {
    const { data } = await apiRequest('/jobs/my/applications');
    tbody.innerHTML = data.length ? data.map((a) => `
      <tr><td>${escapeHtml(a.title)}</td><td>${escapeHtml(a.company)}</td><td>${formatDate(a.applied_at)}</td><td><span class="status-pill ${a.status}">${a.status.replace('_',' ')}</span></td></tr>
    `).join('') : `<tr><td colspan="4"><div class="empty-state">You haven't applied to any jobs yet.</div></td></tr>`;
  } catch (err) { tbody.innerHTML = `<tr><td colspan="4">${err.message}</td></tr>`; }
}

async function loadSaved() {
  const grid = document.getElementById('saved-grid');
  grid.innerHTML = '<div class="loading-state"><span class="spinner"></span></div>';
  try {
    const { data } = await apiRequest('/jobs/my/saved');
    grid.innerHTML = data.length ? data.map(renderJobCard).join('') : `<div class="empty-state" style="grid-column:1/-1;">No saved jobs yet.</div>`;
  } catch (err) { grid.innerHTML = `<div class="empty-state">${err.message}</div>`; }
}

async function loadMyJobs() {
  const tbody = document.getElementById('myjobs-tbody');
  tbody.innerHTML = `<tr><td colspan="5"><div class="loading-state"><span class="spinner"></span></div></td></tr>`;
  try {
    const { data } = await apiRequest('/jobs/my/posted');
    tbody.innerHTML = data.length ? data.map((j) => `
      <tr>
        <td>${escapeHtml(j.title)}</td><td>${escapeHtml(j.company)}</td><td>${formatDate(j.created_at)}</td>
        <td><span class="status-pill ${j.status}">${j.status}</span></td>
        <td class="row-actions">
          <button class="icon-btn" title="View Applicants" onclick="viewApplicants(${j.id}, '${escapeHtml(j.title).replace(/'/g, "\\'")}')"><i class="fa-solid fa-users"></i></button>
          <button class="icon-btn" title="Edit" onclick='openJobForm(${JSON.stringify(j)})'><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn danger" title="Delete" onclick="deleteJob(${j.id})"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`).join('') : `<tr><td colspan="5"><div class="empty-state">You haven't posted any jobs yet.</div></td></tr>`;
  } catch (err) { tbody.innerHTML = `<tr><td colspan="5">${err.message}</td></tr>`; }
}

async function viewApplicants(jobId, jobTitle) {
  const modal = document.getElementById('applicants-modal');
  const body = document.getElementById('applicants-body');
  document.getElementById('applicants-title').textContent = `Applicants — ${jobTitle}`;
  modal.classList.add('open');
  body.innerHTML = '<div class="loading-state"><span class="spinner"></span></div>';
  try {
    const { data } = await apiRequest(`/applications/job/${jobId}`);
    body.innerHTML = data.length ? data.map((a) => `
      <div class="card mb-2" style="padding:14px;">
        <div class="flex gap-2" style="align-items:center;">
          ${avatarHtml(a)}
          <div style="flex:1; min-width:0;">
            <strong style="font-size:0.9rem;">${escapeHtml(a.full_name)}</strong>
            <p class="text-soft" style="font-size:0.78rem;">${escapeHtml(a.university || '')}${a.graduation_year ? ' · ' + a.graduation_year : ''}</p>
          </div>
          <select class="form-control" style="width:auto; padding:6px 10px; font-size:0.8rem;" onchange="updateApplicantStatus(${a.application_id}, this.value, ${jobId}, '${jobTitle.replace(/'/g, "\\'")}')">
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
async function updateApplicantStatus(applicationId, status, jobId, jobTitle) {
  try {
    await apiRequest(`/applications/${applicationId}/status`, { method: 'PUT', body: { status } });
    showToast('Applicant status updated.', 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

function openJobForm(job = null) {
  const form = document.getElementById('job-form');
  form.reset();
  document.getElementById('job-form-title').textContent = job ? 'Edit Job' : 'Post a Job';
  form.job_id.value = job?.id || '';
  if (job) {
    form.title.value = job.title; form.company.value = job.company; form.location.value = job.location || '';
    form.job_type.value = job.job_type; form.experience_required.value = job.experience_required || '';
    form.salary_range.value = job.salary_range || ''; form.description.value = job.description;
    form.skills_required.value = job.skills_required || ''; form.last_date_to_apply.value = job.last_date_to_apply || '';
  }
  document.getElementById('job-form-modal').classList.add('open');
}
async function submitJobForm(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const jobId = formData.get('job_id');
  const payload = Object.fromEntries(formData);
  delete payload.job_id;
  try {
    if (jobId) await apiRequest(`/jobs/${jobId}`, { method: 'PUT', body: payload });
    else await apiRequest('/jobs', { method: 'POST', body: payload });
    showToast(jobId ? 'Job updated!' : 'Job posted!', 'success');
    document.getElementById('job-form-modal').classList.remove('open');
    if (activeTab === 'myjobs') loadMyJobs(); else loadJobs();
  } catch (err) { showToast(err.message, 'error'); }
}
async function deleteJob(id) {
  if (!confirm('Delete this job posting? This cannot be undone.')) return;
  try {
    await apiRequest(`/jobs/${id}`, { method: 'DELETE' });
    showToast('Job deleted.', 'success');
    loadMyJobs();
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
function changePage(page) { currentPage = page; loadJobs(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
