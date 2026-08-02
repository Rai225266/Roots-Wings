let feedPage = 1;
let currentUserCache = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.getUser();
  if (!user) return;
  currentUserCache = user;

  document.getElementById('welcome-banner').innerHTML = `
    <h2 style="font-size:1.4rem;">Welcome back, ${escapeHtml(user.full_name.split(' ')[0])} 👋</h2>
    <p class="text-soft" style="margin-top:6px;">${user.role === 'student' ? 'Explore opportunities, connect with alumni, and take your career to new heights.' : 'Thanks for helping the next generation grow — post updates, mentor, and hire.'}</p>
  `;
  document.getElementById('composer-avatar').innerHTML = avatarHtml(user);

  if (user.role === 'student') {
    document.getElementById('student-side-widgets').style.display = 'block';
    loadStudentWidgets();
  } else {
    document.getElementById('alumni-quick-actions').style.display = 'block';
    document.getElementById('alumni-side-widgets').style.display = 'block';
    loadAlumniWidgets();
  }

  loadStatCards();
  loadFeed();
  loadUpcomingEvents();
  loadTrendingCompanies();
  initModals();
  initFeedComposer();
});

/* -------------------- Stat cards -------------------- */
async function loadStatCards() {
  const user = Auth.getUser();
  try {
    if (user.role === 'student') {
      const [alumniRes, jobsRes, internshipsRes, eventsRes] = await Promise.all([
        apiRequest('/alumni?limit=1'), apiRequest('/jobs?limit=1'), apiRequest('/internships?limit=1'), apiRequest('/events?limit=1')
      ]);
      renderStatCards([
        { icon: 'fa-users', color: 'c-green', value: alumniRes.pagination.total, label: 'Alumni' },
        { icon: 'fa-briefcase', color: 'c-peach', value: jobsRes.pagination.total, label: 'Job Openings' },
        { icon: 'fa-laptop-code', color: 'c-blue', value: internshipsRes.pagination.total, label: 'Internships' },
        { icon: 'fa-calendar-days', color: 'c-purple', value: eventsRes.pagination.total, label: 'Upcoming Events' }
      ]);
    } else {
      const [mentorRes, jobsRes, internshipsRes, eventsRes] = await Promise.all([
        apiRequest('/mentorship/my'), apiRequest('/jobs/my/posted'), apiRequest('/internships/my/posted'), apiRequest('/events/my/events')
      ]);
      const pending = mentorRes.data.filter((m) => m.status === 'pending');
      renderStatCards([
        { icon: 'fa-handshake-angle', color: 'c-green', value: pending.length, label: 'Pending Requests' },
        { icon: 'fa-briefcase', color: 'c-peach', value: jobsRes.data.length, label: 'Jobs Posted' },
        { icon: 'fa-laptop-code', color: 'c-blue', value: internshipsRes.data.length, label: 'Internships Posted' },
        { icon: 'fa-calendar-days', color: 'c-purple', value: eventsRes.data.created.length, label: 'Events Created' }
      ]);
    }
  } catch (err) { showToast(err.message, 'error'); }
}
function renderStatCards(items) {
  document.getElementById('stat-cards').innerHTML = items.map((s) => `
    <div class="card stat-card">
      <div class="stat-icon ${s.color}"><i class="fa-solid ${s.icon}"></i></div>
      <div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
    </div>`).join('');
}

/* -------------------- Alumni Feed -------------------- */
function initFeedComposer() {
  document.getElementById('post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await apiRequest('/posts', { method: 'POST', body: { content: formData.get('content'), tags: formData.get('tags') } });
      showToast('Posted to the feed!', 'success');
      e.target.reset();
      feedPage = 1;
      loadFeed();
    } catch (err) { showToast(err.message, 'error'); }
  });

  document.getElementById('load-more-feed').addEventListener('click', () => { feedPage++; loadFeed(true); });

  document.getElementById('comment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const postId = formData.get('post_id');
    try {
      await apiRequest(`/posts/${postId}/comments`, { method: 'POST', body: { comment: formData.get('comment') } });
      e.target.reset();
      openComments(postId);
      loadFeed();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

async function loadFeed(append = false) {
  const list = document.getElementById('feed-list');
  if (!append) list.innerHTML = '<div class="loading-state"><span class="spinner"></span>Loading feed...</div>';
  try {
    const { data, pagination } = await apiRequest(`/posts?page=${feedPage}&limit=8`);
    const html = data.length ? data.map(renderPost).join('') : `<div class="empty-state"><i class="fa-regular fa-comments"></i><p>No posts yet. Be the first to share something with the community.</p></div>`;
    list.innerHTML = append ? list.innerHTML + html : html;
    document.getElementById('load-more-feed').style.display = pagination.page < pagination.totalPages ? 'inline-flex' : 'none';
  } catch (err) {
    if (!append) list.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

function renderPost(p) {
  const tags = (p.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  const roleLine = p.role === 'alumni' ? `${escapeHtml(p.designation || '')}${p.current_company ? ' at ' + escapeHtml(p.current_company) : ''}` : 'Student';
  return `
    <div class="feed-post" data-post-id="${p.id}">
      <div class="feed-post-head">
        ${avatarHtml(p)}
        <div class="meta"><strong>${escapeHtml(p.full_name)}</strong><span>${roleLine} · ${timeAgo(p.created_at)}</span></div>
      </div>
      <div class="feed-post-body">${escapeHtml(p.content)}</div>
      ${tags.length ? `<div class="feed-post-tags">${tags.map((t) => `<span class="feed-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      <div class="feed-post-actions">
        <button class="feed-action-btn ${p.liked_by_me ? 'liked' : ''}" onclick="toggleLike(${p.id})"><i class="fa-solid fa-thumbs-up"></i> ${p.like_count}</button>
        <button class="feed-action-btn" onclick="openComments(${p.id})"><i class="fa-regular fa-comment"></i> ${p.comment_count} ${p.comment_count === 1 ? 'comment' : 'comments'}</button>
      </div>
    </div>`;
}

async function toggleLike(postId) {
  try {
    await apiRequest(`/posts/${postId}/like`, { method: 'POST' });
    loadFeed();
  } catch (err) { showToast(err.message, 'error'); }
}

async function openComments(postId) {
  document.getElementById('comments-modal').classList.add('open');
  document.querySelector('#comment-form [name="post_id"]').value = postId;
  const list = document.getElementById('comments-list');
  list.innerHTML = '<div class="loading-state"><span class="spinner"></span></div>';
  try {
    const { data } = await apiRequest(`/posts/${postId}/comments`);
    list.innerHTML = data.length ? data.map((c) => `
      <div class="feed-comment">
        ${avatarHtml(c)}
        <div class="feed-comment-body"><strong>${escapeHtml(c.full_name)}</strong>${escapeHtml(c.comment)}</div>
      </div>`).join('') : '<p class="text-soft" style="font-size:0.85rem;">No comments yet.</p>';
  } catch (err) { list.innerHTML = `<p class="text-soft">${err.message}</p>`; }
}

/* -------------------- Upcoming Events / Trending Companies -------------------- */
async function loadUpcomingEvents() {
  try {
    const { data } = await apiRequest('/events?limit=3');
    document.getElementById('upcoming-events-list').innerHTML = data.length ? data.map((e) => {
      const d = new Date(e.event_date);
      return `
      <div class="list-row">
        <div class="list-row-icon" style="background:var(--wing-100); color:var(--wing-600); font-size:0.7rem; line-height:1.1; flex-direction:column;">
          <span style="font-size:0.62rem; font-weight:800;">${d.toLocaleString('en-US',{month:'short'}).toUpperCase()}</span><span style="font-size:0.95rem;">${d.getDate()}</span>
        </div>
        <div class="list-row-body">
          <strong>${escapeHtml(e.title)}</strong>
          <div class="list-row-meta"><span>${e.is_online ? 'Online' : escapeHtml(e.location || '')}</span>${e.event_time ? `<span>${e.event_time.slice(0,5)}</span>` : ''}</div>
        </div>
      </div>`;
    }).join('') : emptyRow('No upcoming events.');
  } catch (err) { showToast(err.message, 'error'); }
}

async function loadTrendingCompanies() {
  try {
    const { data } = await apiRequest('/jobs/trending/companies');
    document.getElementById('trending-companies-list').innerHTML = data.length ? data.map((c) => `
      <div class="trending-row">
        <div class="trending-logo">${escapeHtml(c.company[0])}</div>
        <div class="meta"><strong>${escapeHtml(c.company)}</strong><span>${c.openings} open position${c.openings == 1 ? '' : 's'}</span></div>
        <i class="fa-solid fa-chevron-right"></i>
      </div>`).join('') : emptyRow('No open postings yet.');
  } catch (err) { showToast(err.message, 'error'); }
}

/* -------------------- Student widgets -------------------- */
async function loadStudentWidgets() {
  try {
    const [appsRes, mentorRes] = await Promise.all([apiRequest('/jobs/my/applications'), apiRequest('/mentorship/my')]);

    const STEPS = ['applied', 'under_review', 'shortlisted', 'interview', 'selected'];
    document.getElementById('my-applications-list').innerHTML = appsRes.data.length ? appsRes.data.slice(0, 3).map((a) => {
      const isRejected = a.status === 'rejected';
      const stepIndex = STEPS.indexOf(a.status);
      return `
      <div class="mb-2" style="padding-bottom:12px; border-bottom:1px solid var(--border);">
        <div class="flex-between"><strong style="font-size:0.88rem;">${escapeHtml(a.title)}</strong><span class="status-pill ${a.status}">${a.status.replace('_',' ')}</span></div>
        <p class="text-soft" style="font-size:0.78rem; margin:4px 0 8px;">${escapeHtml(a.company)}</p>
        ${!isRejected ? `<div class="flex gap-1" style="align-items:center;">${STEPS.map((s, i) => `<div style="flex:1; height:5px; border-radius:3px; background:${i <= stepIndex ? 'var(--root-600)' : 'var(--border)'};"></div>`).join('')}</div>` : ''}
      </div>`;
    }).join('') : emptyRow("You haven't applied to anything yet.");

    const accepted = mentorRes.data.filter((m) => m.status === 'accepted');
    document.getElementById('my-mentors-list').innerHTML = accepted.length ? accepted.map((m) => `
      <div class="flex gap-2 mb-2" style="align-items:center;">
        ${avatarHtml({ full_name: m.alumni_name, profile_picture: m.alumni_picture })}
        <div style="flex:1; min-width:0;"><strong style="font-size:0.88rem;">${escapeHtml(m.alumni_name)}</strong><p class="text-soft" style="font-size:0.76rem;">${escapeHtml(m.designation || '')}${m.current_company ? ' · ' + escapeHtml(m.current_company) : ''}</p></div>
        <a href="/messages.html?to=${m.alumni_id}" class="icon-btn" title="Message"><i class="fa-solid fa-comment"></i></a>
      </div>`).join('') : emptyRow('No active mentors yet — request one from the Alumni Directory.');
  } catch (err) { showToast(err.message, 'error'); }
}

/* -------------------- Alumni widgets -------------------- */
async function loadAlumniWidgets() {
  try {
    const { data } = await apiRequest('/mentorship/my');
    const pending = data.filter((m) => m.status === 'pending');
    const accepted = data.filter((m) => m.status === 'accepted');

    document.getElementById('mentor-requests-list').innerHTML = pending.length ? pending.map((m) => `
      <div class="flex gap-2 mb-2" style="align-items:center;">
        ${avatarHtml({ full_name: m.student_name, profile_picture: m.student_picture })}
        <div style="flex:1; min-width:0;"><strong style="font-size:0.88rem;">${escapeHtml(m.student_name)}</strong><p class="text-soft" style="font-size:0.76rem;">${escapeHtml(m.message || 'Requested mentorship')}</p></div>
        <button class="icon-btn" onclick="respondMentor(${m.id}, 'accepted')" title="Accept"><i class="fa-solid fa-check"></i></button>
        <button class="icon-btn danger" onclick="respondMentor(${m.id}, 'rejected')" title="Decline"><i class="fa-solid fa-xmark"></i></button>
      </div>`).join('') : emptyRow('No pending mentorship requests.');

    document.getElementById('active-mentees-list').innerHTML = accepted.length ? accepted.map((m) => `
      <div class="mb-2" style="padding-bottom:10px; border-bottom:1px solid var(--border);">
        <div class="flex gap-2" style="align-items:center;">
          ${avatarHtml({ full_name: m.student_name, profile_picture: m.student_picture })}
          <div style="flex:1; min-width:0;"><strong style="font-size:0.88rem;">${escapeHtml(m.student_name)}</strong></div>
        </div>
        <div class="flex gap-1 mt-1">
          <a href="/messages.html?to=${m.student_id}" class="btn btn-outline btn-sm" style="flex:1;"><i class="fa-solid fa-comment"></i> Message</a>
          <button class="btn btn-outline btn-sm" style="flex:1;" onclick="openSessionModal(${m.id})"><i class="fa-solid fa-calendar-plus"></i> Schedule</button>
          <button class="btn btn-outline btn-sm" style="flex:1;" onclick="viewSessions(${m.id})"><i class="fa-solid fa-clock-rotate-left"></i> History</button>
        </div>
      </div>`).join('') : emptyRow('No active mentees yet.');
  } catch (err) { showToast(err.message, 'error'); }
}

async function respondMentor(id, status) {
  try {
    await apiRequest(`/mentorship/${id}/respond`, { method: 'PUT', body: { status } });
    showToast(`Request ${status}.`, 'success');
    loadAlumniWidgets();
    loadStatCards();
  } catch (err) { showToast(err.message, 'error'); }
}

function openSessionModal(mentorshipId) {
  document.querySelector('#session-form [name="mentorship_id"]').value = mentorshipId;
  document.getElementById('session-modal').classList.add('open');
}
async function viewSessions(mentorshipId) {
  const modal = document.getElementById('sessions-list-modal');
  const body = document.getElementById('sessions-list-body');
  modal.classList.add('open');
  body.innerHTML = '<div class="loading-state"><span class="spinner"></span></div>';
  try {
    const { data } = await apiRequest(`/mentorship/${mentorshipId}/sessions`);
    body.innerHTML = data.length ? data.map((s) => `
      <div class="timeline-item">
        <strong style="font-size:0.88rem;">${escapeHtml(s.topic || 'Mentorship Session')}</strong>
        <p class="text-soft" style="font-size:0.8rem;">${new Date(s.session_date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        ${s.session_link ? `<a href="${s.session_link}" target="_blank" style="font-size:0.8rem;">Meeting link →</a>` : ''}
        ${s.notes ? `<p class="text-soft" style="font-size:0.8rem;">${escapeHtml(s.notes)}</p>` : ''}
      </div>`).join('') : '<div class="empty-state">No sessions logged yet.</div>';
  } catch (err) { body.innerHTML = `<div class="empty-state">${err.message}</div>`; }
}

/* -------------------- shared helpers -------------------- */
function emptyRow(msg) { return `<div class="empty-state" style="padding:20px 0;"><i class="fa-regular fa-folder-open"></i><p style="font-size:0.85rem;">${msg}</p></div>`; }

/* -------------------- Modals: post job/internship/event/session -------------------- */
function initModals() {
  document.getElementById('open-post-job')?.addEventListener('click', () => openModal('job-modal'));
  document.getElementById('open-post-internship')?.addEventListener('click', () => openModal('internship-modal'));
  document.getElementById('open-create-event')?.addEventListener('click', () => openModal('event-modal'));
  document.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', () => closeModal(btn.dataset.close)));
  document.querySelectorAll('.modal-overlay').forEach((overlay) => overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); }));

  document.getElementById('job-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await apiRequest('/jobs', { method: 'POST', body: Object.fromEntries(formData) });
      showToast('Job posted successfully!', 'success');
      closeModal('job-modal'); e.target.reset();
      loadStatCards();
    } catch (err) { showToast(err.message, 'error'); }
  });

  document.getElementById('internship-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await apiRequest('/internships', { method: 'POST', body: Object.fromEntries(formData) });
      showToast('Internship posted successfully!', 'success');
      closeModal('internship-modal'); e.target.reset();
      loadStatCards();
    } catch (err) { showToast(err.message, 'error'); }
  });

  document.getElementById('event-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await apiRequest('/events', { method: 'POST', body: Object.fromEntries(formData) });
      showToast('Event created successfully!', 'success');
      closeModal('event-modal'); e.target.reset();
      loadStatCards();
      loadUpcomingEvents();
    } catch (err) { showToast(err.message, 'error'); }
  });

  document.getElementById('session-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const mentorshipId = formData.get('mentorship_id');
    try {
      await apiRequest(`/mentorship/${mentorshipId}/sessions`, { method: 'POST', body: Object.fromEntries(formData) });
      showToast('Session scheduled!', 'success');
      closeModal('session-modal'); e.target.reset();
    } catch (err) { showToast(err.message, 'error'); }
  });
}
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
