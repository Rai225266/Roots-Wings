document.addEventListener('DOMContentLoaded', async () => {
  // Update nav based on auth state
  const authArea = document.getElementById('nav-auth-area');
  if (authArea) {
    if (Auth.isLoggedIn()) {
      const user = Auth.getUser();
      authArea.innerHTML = `
        <a href="/dashboard.html" class="btn btn-outline btn-sm">Dashboard</a>
        <div class="user-chip" onclick="window.location.href='/profile.html'">
          ${avatarHtml(user)}
          <span>${(user?.full_name || 'Account').split(' ')[0]}</span>
        </div>`;
    } else {
      authArea.innerHTML = `
        <a href="/login.html" class="btn btn-outline btn-sm">Log In</a>
        <a href="/register.html" class="btn btn-primary btn-sm">Join Free</a>`;
    }
  }

  loadStats();
  loadTestimonials();
  initContactForm();
});

async function loadStats() {
  try {
    const { data } = await apiRequest('/public/stats', { auth: false });
    animateCount('stat-students', data.students);
    animateCount('stat-alumni', data.alumni);
    animateCount('stat-jobs', data.jobs);
    animateCount('stat-events', data.events);
  } catch (err) {
    // Silently ignore on landing page if DB not yet connected
  }
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  target = target || 0;
  let current = 0;
  const step = Math.max(Math.ceil(target / 40), 1);
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = current.toLocaleString() + '+';
  }, 30);
}

async function loadTestimonials() {
  const track = document.getElementById('testimonial-track');
  if (!track) return;
  try {
    const { data } = await apiRequest('/public/testimonials', { auth: false });
    track.innerHTML = data.map((t) => `
      <div class="testimonial-card card reveal">
        <i class="fa-solid fa-quote-left"></i>
        <p class="quote">${escapeHtml(t.quote)}</p>
        <div class="testimonial-person">
          <div class="avatar">${initials(t.name)}</div>
          <div>
            <strong>${escapeHtml(t.name)}</strong>
            <span>${escapeHtml(t.role || '')}</span>
          </div>
        </div>
      </div>`).join('');
    initReveal();
  } catch (err) {
    track.innerHTML = '<p class="text-soft">Testimonials will appear here once the platform is live.</p>';
  }
}

function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      const formData = new FormData(form);
      await apiRequest('/public/contact', {
        method: 'POST',
        auth: false,
        body: {
          name: formData.get('name'),
          email: formData.get('email'),
          subject: formData.get('subject'),
          message: formData.get('message')
        }
      });
      showToast('Message sent! We will get back to you soon.', 'success');
      form.reset();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });
}
