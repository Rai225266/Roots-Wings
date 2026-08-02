let currentPage = 1;
const user = Auth.getUser();
let calDate = new Date();

document.addEventListener('DOMContentLoaded', () => {
  if (user.role === 'alumni' || user.role === 'admin') {
    document.getElementById('open-create').style.display = 'inline-flex';
  }
  document.getElementById('open-create').addEventListener('click', () => document.getElementById('form-modal').classList.add('open'));

  document.querySelectorAll('.tabs .tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tabs .tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      document.getElementById('view-list').style.display = view === 'list' ? 'block' : 'none';
      document.getElementById('view-calendar').style.display = view === 'calendar' ? 'block' : 'none';
      document.getElementById('view-mine').style.display = view === 'mine' ? 'block' : 'none';
      if (view === 'calendar') renderCalendar();
      if (view === 'mine') loadMine();
    });
  });

  document.getElementById('cal-prev').addEventListener('click', () => { calDate.setMonth(calDate.getMonth() - 1); renderCalendar(); });
  document.getElementById('cal-next').addEventListener('click', () => { calDate.setMonth(calDate.getMonth() + 1); renderCalendar(); });

  loadEvents();
  document.getElementById('search-input').addEventListener('input', debounce(() => { currentPage = 1; loadEvents(); }, 400));
  document.getElementById('filter-type').addEventListener('change', () => { currentPage = 1; loadEvents(); });

  document.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.remove('open')));
  document.querySelectorAll('.modal-overlay').forEach((overlay) => overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); }));

  document.getElementById('event-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await apiRequest('/events', { method: 'POST', body: Object.fromEntries(formData) });
      showToast('Event created!', 'success');
      document.getElementById('form-modal').classList.remove('open');
      e.target.reset();
      loadEvents();
    } catch (err) { showToast(err.message, 'error'); }
  });
});

async function loadEvents() {
  const grid = document.getElementById('events-grid');
  grid.innerHTML = '<div class="loading-state"><span class="spinner"></span>Loading events...</div>';
  const params = new URLSearchParams({
    search: document.getElementById('search-input').value,
    event_type: document.getElementById('filter-type').value,
    page: currentPage, limit: 9
  });
  try {
    const { data, pagination } = await apiRequest(`/events?${params}`);
    grid.innerHTML = data.length ? data.map(renderEventCard).join('') : `<div class="empty-state" style="grid-column:1/-1;"><i class="fa-solid fa-calendar-xmark"></i><p>No upcoming events match your search.</p></div>`;
    renderPagination(pagination);
  } catch (err) { grid.innerHTML = `<div class="empty-state">${err.message}</div>`; }
}

function renderEventCard(e) {
  const d = new Date(e.event_date);
  return `
    <div class="card event-card reveal in-view">
      <div class="event-top mb-2">
        <div class="event-date-box"><span class="d">${d.getDate()}</span><span class="m">${d.toLocaleString('en-US',{month:'short'})}</span></div>
        <div><h3 style="font-size:1.02rem;">${escapeHtml(e.title)}</h3><p class="text-soft" style="font-size:0.8rem;">${e.is_online ? 'Online' : escapeHtml(e.location || '')}</p></div>
      </div>
      <p class="text-soft" style="font-size:0.85rem;">${escapeHtml((e.description || '').slice(0, 90))}${e.description?.length > 90 ? '…' : ''}</p>
      <div class="job-footer">
        <span class="badge">${e.event_type}</span>
        <button class="btn btn-outline btn-sm" onclick="viewEvent(${e.id})">Details</button>
      </div>
    </div>`;
}

async function viewEvent(id) {
  const modal = document.getElementById('detail-modal');
  const body = document.getElementById('detail-body');
  modal.classList.add('open');
  body.innerHTML = '<div class="loading-state"><span class="spinner"></span></div>';
  try {
    const { data: e } = await apiRequest(`/events/${id}`);
    body.innerHTML = `
      <span class="badge mb-2">${e.event_type}</span>
      <h2 style="font-size:1.3rem;">${escapeHtml(e.title)}</h2>
      <p class="text-soft mb-2">${formatDate(e.event_date)} ${e.event_time ? 'at ' + e.event_time.slice(0,5) : ''} · ${e.is_online ? 'Online' : escapeHtml(e.location || '')}</p>
      <p class="mb-2">${escapeHtml(e.description || '')}</p>
      <p class="text-soft mb-3" style="font-size:0.85rem;"><i class="fa-solid fa-users"></i> ${e.participant_count} joined ${e.max_participants ? '/ ' + e.max_participants + ' max' : ''} · Hosted by ${escapeHtml(e.creator_name)}</p>
      ${e.is_online && e.meeting_link ? `<p class="mb-2"><a href="${e.meeting_link}" target="_blank" class="btn btn-outline btn-sm">Meeting Link <i class="fa-solid fa-arrow-up-right-from-square"></i></a></p>` : ''}
      <button class="btn btn-primary btn-block" onclick="joinEvent(${e.id})"><i class="fa-solid fa-calendar-check"></i> Join / Leave Event</button>
    `;
  } catch (err) { body.innerHTML = `<div class="empty-state">${err.message}</div>`; }
}

async function joinEvent(id) {
  try {
    const res = await apiRequest(`/events/${id}/join`, { method: 'POST' });
    showToast(res.message, 'success');
    viewEvent(id);
  } catch (err) { showToast(err.message, 'error'); }
}

async function loadMine() {
  try {
    const { data } = await apiRequest('/events/my/events');
    document.getElementById('created-grid').innerHTML = data.created.length ? data.created.map(renderEventCard).join('') : `<div class="empty-state" style="grid-column:1/-1;">You haven't created any events.</div>`;
    document.getElementById('joined-grid').innerHTML = data.joined.length ? data.joined.map(renderEventCard).join('') : `<div class="empty-state" style="grid-column:1/-1;">You haven't joined any events yet.</div>`;
  } catch (err) { showToast(err.message, 'error'); }
}

async function renderCalendar() {
  document.getElementById('cal-month-label').textContent = calDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  document.getElementById('calendar-day-names').innerHTML = dayNames.map((d) => `<div class="calendar-day-name">${d}</div>`).join('');

  const year = calDate.getFullYear(), month = calDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let events = [];
  try {
    const start = new Date(year, month, 1).toISOString().slice(0,10);
    const end = new Date(year, month + 1, 0).toISOString().slice(0,10);
    const { data } = await apiRequest(`/events?limit=100&upcoming=false`);
    events = data.filter((e) => e.event_date >= start && e.event_date <= end);
  } catch (err) { /* ignore */ }

  const grid = document.getElementById('calendar-grid');
  let html = '';
  for (let i = 0; i < firstDay; i++) html += `<div class="calendar-cell empty"></div>`;
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayEvents = events.filter((e) => e.event_date === dateStr);
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    html += `<div class="calendar-cell ${isToday ? 'today' : ''}">
      <div class="date-num">${day}</div>
      ${dayEvents.map((e) => `<span class="calendar-event-dot" onclick="viewEvent(${e.id})" title="${escapeHtml(e.title)}">${escapeHtml(e.title)}</span>`).join('')}
    </div>`;
  }
  grid.innerHTML = html;
}

function renderPagination(p) {
  const el = document.getElementById('pagination');
  if (p.totalPages <= 1) { el.innerHTML = ''; return; }
  let html = `<button ${p.page === 1 ? 'disabled' : ''} onclick="changePage(${p.page - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;
  for (let i = 1; i <= p.totalPages; i++) html += `<button class="${i === p.page ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
  html += `<button ${p.page === p.totalPages ? 'disabled' : ''} onclick="changePage(${p.page + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;
  el.innerHTML = html;
}
function changePage(page) { currentPage = page; loadEvents(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
