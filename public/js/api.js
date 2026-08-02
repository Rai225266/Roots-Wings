/* ============================================================
   Roots & Wings — Shared frontend utilities
   ============================================================ */

const API_BASE = '/api';

const Auth = {
  getToken() { return localStorage.getItem('rw_token'); },
  setToken(t) { localStorage.setItem('rw_token', t); },
  getUser() { try { return JSON.parse(localStorage.getItem('rw_user')); } catch { return null; } },
  setUser(u) { localStorage.setItem('rw_user', JSON.stringify(u)); },
  clear() { localStorage.removeItem('rw_token'); localStorage.removeItem('rw_user'); },
  isLoggedIn() { return !!this.getToken(); },
  requireAuth() {
    if (!this.isLoggedIn()) { window.location.href = '/login.html'; return false; }
    return true;
  },
  requireRole(...roles) {
    const user = this.getUser();
    if (!user || !roles.includes(user.role)) { window.location.href = '/dashboard.html'; return false; }
    return true;
  },
  logout() {
    this.clear();
    window.location.href = '/login.html';
  }
};

async function apiRequest(endpoint, { method = 'GET', body, isForm = false, auth = true } = {}) {
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (auth && Auth.getToken()) headers['Authorization'] = `Bearer ${Auth.getToken()}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined
  });

  let data;
  try { data = await res.json(); } catch { data = {}; }

  if (res.status === 401 && auth) {
    Auth.clear();
    window.location.href = '/login.html';
    return Promise.reject(new Error('Session expired'));
  }

  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong. Please try again.');
  }
  return data;
}

/* -------------------- Toast notifications -------------------- */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 300ms ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3800);
}

/* -------------------- Theme toggle -------------------- */
function initTheme() {
  const saved = localStorage.getItem('rw_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('rw_theme', next);
  updateThemeIcon(next);
}
function updateThemeIcon(theme) {
  document.querySelectorAll('.theme-toggle i').forEach((icon) => {
    icon.className = theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  });
}
initTheme();

/* -------------------- Mobile nav toggle -------------------- */
function initNavToggle() {
  const toggleBtn = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => navLinks.classList.toggle('open'));
  }
}

/* -------------------- Scroll reveal -------------------- */
function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('in-view'), i * 60);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach((item) => observer.observe(item));
}

/* -------------------- Helpers -------------------- */
function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('');
}
function avatarHtml(user, sizeClass = '') {
  const size = sizeClass ? sizeClass : '';
  if (user && user.profile_picture) {
    return `<img class="avatar ${size}" src="${user.profile_picture}" alt="${user.full_name || user.name || ''}">`;
  }
  const name = user?.full_name || user?.name || user?.contact_name || '?';
  return `<div class="avatar ${size}">${initials(name)}</div>`;
}
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
function formatDate(dateStr, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', opts);
}
function debounce(fn, delay = 400) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  initReveal();
  document.querySelectorAll('.theme-toggle').forEach((btn) => btn.addEventListener('click', toggleTheme));
});
