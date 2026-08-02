/* ============================================================
   Roots & Wings — Dashboard shell (sidebar + topbar)
   Injected into every authenticated app page.
   ============================================================ */

const NAV_ITEMS = [
  { page: 'dashboard', href: '/dashboard.html', icon: 'fa-gauge-high', label: 'Dashboard' },
  { page: 'alumni', href: '/alumni.html', icon: 'fa-users', label: 'Alumni' },
  { page: 'jobs', href: '/jobs.html', icon: 'fa-briefcase', label: 'Jobs' },
  { page: 'internships', href: '/internships.html', icon: 'fa-laptop-code', label: 'Internships' },
  { page: 'events', href: '/events.html', icon: 'fa-calendar-days', label: 'Events' },
  { page: 'messages', href: '/messages.html', icon: 'fa-comment', label: 'Messages', badgeKey: 'messages' },
  { page: 'saved', href: '/jobs.html?tab=saved', icon: 'fa-bookmark', label: 'Saved' },
  { page: 'profile', href: '/profile.html', icon: 'fa-user', label: 'Profile' },
  { page: 'settings', href: '/profile.html?tab=security', icon: 'fa-gear', label: 'Settings' }
];

async function buildLayout() {
  if (!Auth.requireAuth()) return;
  const user = Auth.getUser();
  const currentPage = document.body.dataset.page;

  const sidebarEl = document.getElementById('sidebar');
  const topbarEl = document.getElementById('topbar');
  if (!sidebarEl || !topbarEl) return;

  let unreadMessages = 0, unreadNotifs = 0;
  try { unreadMessages = (await apiRequest('/messages/unread/count')).count || 0; } catch (e) { /* ignore */ }
  try { unreadNotifs = (await apiRequest('/notifications/unread/count')).count || 0; } catch (e) { /* ignore */ }

  const navHtml = NAV_ITEMS.map((item) => {
    const badge = item.badgeKey === 'messages' && unreadMessages > 0 ? `<span class="side-nav-badge">${unreadMessages}</span>` : '';
    return `
    <a href="${item.href}" class="${currentPage === item.page ? 'active' : ''}">
      <i class="fa-solid ${item.icon}"></i> ${item.label} ${badge}
    </a>`;
  }).join('');

  const adminLink = user.role === 'admin'
    ? `<div class="nav-section-label">Administration</div>
       <a href="/admin.html" class="${currentPage === 'admin' ? 'active' : ''}"><i class="fa-solid fa-shield-halved"></i> Admin Panel</a>`
    : '';

  sidebarEl.innerHTML = `
    <a href="/" class="brand">
      <img src="/images/logo-mark.png" alt="Roots & Wings" class="brand-logo-mark">
      <span class="brand-wordmark">ROOTS<br>&amp; WINGS</span>
    </a>
    <p class="sidebar-tagline">Connect. Learn. Grow.</p>
    <nav class="side-nav">${navHtml}${adminLink}</nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        ${avatarHtml(user)}
        <div>
          <strong>${escapeHtml(user.full_name)}</strong>
          <span class="role-badge">${escapeHtml(user.role)}</span>
        </div>
      </div>
      <button class="btn btn-outline btn-sm btn-block mt-2" id="logout-btn"><i class="fa-solid fa-right-from-bracket"></i> Log Out</button>
    </div>
  `;

  topbarEl.innerHTML = `
    <div class="flex gap-2" style="align-items:center; flex:1;">
      <button class="sidebar-toggle-mobile" id="sidebar-toggle"><i class="fa-solid fa-bars"></i></button>
      <div class="topbar-search"><i class="fa-solid fa-magnifying-glass"></i><input class="form-control" id="topbar-search-input" placeholder="Search for alumni, jobs, events..."></div>
    </div>
    <div class="flex gap-2" style="align-items:center;">
      <button class="theme-toggle"><i class="fa-solid fa-moon"></i></button>
      <div style="position:relative;">
        <button class="notif-btn" id="notif-btn"><i class="fa-solid fa-bell"></i>${unreadNotifs > 0 ? `<span class="notif-count">${unreadNotifs}</span>` : ''}</button>
        <div id="notif-dropdown" class="card" style="display:none; position:absolute; right:0; top:52px; width:320px; max-height:400px; overflow-y:auto; z-index:500;"></div>
      </div>
      <a href="/messages.html" class="notif-btn" style="position:relative; text-decoration:none;">
        <i class="fa-solid fa-comment-dots"></i>${unreadMessages > 0 ? `<span class="notif-count msg-count">${unreadMessages}</span>` : ''}
      </a>
      <div style="position:relative;">
        <button class="user-chip" id="user-chip-btn">
          ${avatarHtml(user)}
          <div style="text-align:left; line-height:1.2;">
            <span style="display:block;">${escapeHtml(user.full_name)}</span>
            <span style="display:block; font-size:0.72rem; color:var(--text-soft); text-transform:capitalize;">${escapeHtml(user.role)}</span>
          </div>
          <i class="fa-solid fa-chevron-down" style="font-size:0.7rem; color:var(--text-soft);"></i>
        </button>
        <div id="user-dropdown" class="card" style="display:none; position:absolute; right:0; top:56px; width:180px; z-index:500; padding:8px;">
          <a href="/profile.html" class="dropdown-link"><i class="fa-solid fa-user"></i> Profile</a>
          <a href="/profile.html?tab=security" class="dropdown-link"><i class="fa-solid fa-gear"></i> Settings</a>
          <button class="dropdown-link" id="dropdown-logout" style="width:100%; text-align:left; background:none; border:none;"><i class="fa-solid fa-right-from-bracket"></i> Log Out</button>
        </div>
      </div>
    </div>
  `;

  const searchInput = document.getElementById('topbar-search-input');
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && searchInput.value.trim()) {
      window.location.href = `/alumni.html?search=${encodeURIComponent(searchInput.value.trim())}`;
    }
  });

  document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());
  document.getElementById('dropdown-logout').addEventListener('click', () => Auth.logout());
  document.querySelectorAll('.theme-toggle').forEach((btn) => btn.addEventListener('click', toggleTheme));
  updateThemeIcon(document.documentElement.getAttribute('data-theme') || 'light');

  const userChipBtn = document.getElementById('user-chip-btn');
  const userDropdown = document.getElementById('user-dropdown');
  userChipBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
  });
  document.addEventListener('click', () => { userDropdown.style.display = 'none'; });

  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.add('open');
      backdrop.classList.add('show');
    });
    backdrop?.addEventListener('click', () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('show');
    });
  }

  initNotifications();
}

async function initNotifications() {
  const btn = document.getElementById('notif-btn');
  const dropdown = document.getElementById('notif-dropdown');
  if (!btn) return;

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const isOpen = dropdown.style.display === 'block';
    dropdown.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) {
      dropdown.innerHTML = '<div class="loading-state" style="padding:20px;"><span class="spinner"></span></div>';
      try {
        const { data } = await apiRequest('/notifications');
        dropdown.innerHTML = data.length
          ? data.map((n) => `
            <div style="padding:12px 16px; border-bottom:1px solid var(--border);">
              <strong style="font-size:0.85rem;">${escapeHtml(n.title)}</strong>
              <p class="text-soft" style="font-size:0.8rem; margin-top:2px;">${escapeHtml(n.message || '')}</p>
              <span class="text-soft" style="font-size:0.7rem;">${timeAgo(n.created_at)}</span>
            </div>`).join('')
          : '<div class="empty-state" style="padding:30px;"><i class="fa-regular fa-bell-slash"></i><p>No notifications yet</p></div>';
        await apiRequest('/notifications/read-all', { method: 'PUT' });
        document.querySelector('.notif-count')?.remove();
      } catch (err) {
        dropdown.innerHTML = '<div class="empty-state" style="padding:20px;">Could not load notifications.</div>';
      }
    }
  });
  document.addEventListener('click', () => { dropdown.style.display = 'none'; });
}

document.addEventListener('DOMContentLoaded', buildLayout);
