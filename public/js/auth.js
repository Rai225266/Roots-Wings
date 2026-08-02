document.addEventListener('DOMContentLoaded', () => {
  if (Auth.isLoggedIn() && document.body.dataset.page !== 'reset') {
    // Already logged in — skip auth pages
    if (['login', 'register'].includes(document.body.dataset.page)) {
      window.location.href = '/dashboard.html';
      return;
    }
  }

  initLoginForm();
  initRegisterForm();
  initForgotForm();
  initResetForm();
  initPasswordToggles();
});

function initPasswordToggles() {
  document.querySelectorAll('.toggle-eye').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (input.type === 'password') { input.type = 'text'; btn.querySelector('i').className = 'fa-solid fa-eye-slash'; }
      else { input.type = 'password'; btn.querySelector('i').className = 'fa-solid fa-eye'; }
    });
  });
}

/* -------------------- LOGIN -------------------- */
function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  // Demo account quick-fill buttons
  document.querySelectorAll('.demo-account-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      form.querySelector('[name="email"]').value = btn.dataset.email;
      form.querySelector('[name="password"]').value = btn.dataset.password;
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      const formData = new FormData(form);
      const data = await apiRequest('/auth/login', {
        method: 'POST', auth: false,
        body: { email: formData.get('email'), password: formData.get('password') }
      });
      Auth.setToken(data.token);
      Auth.setUser(data.user);
      showToast(`Welcome back, ${data.user.full_name.split(' ')[0]}!`, 'success');
      setTimeout(() => {
        window.location.href = data.user.role === 'admin' ? '/admin.html' : '/dashboard.html';
      }, 500);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });
}

/* -------------------- REGISTER -------------------- */
function initRegisterForm() {
  const roleButtons = document.querySelectorAll('.role-toggle button');
  const studentFields = document.getElementById('student-fields');
  const alumniFields = document.getElementById('alumni-fields');
  const roleInput = document.getElementById('selected-role');
  const form = document.getElementById('register-form');
  if (!form) return;

  roleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      roleButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const role = btn.dataset.role;
      roleInput.value = role;
      studentFields.classList.toggle('active', role === 'student');
      alumniFields.classList.toggle('active', role === 'alumni');
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const role = roleInput.value;
    const formData = new FormData(form);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirm_password');

    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    if (!formData.get('terms')) {
      showToast('Please accept the Terms of Service to continue.', 'error');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';

    const basePayload = {
      full_name: formData.get('full_name'),
      email: formData.get('email'),
      password,
      phone: formData.get('phone'),
      university: formData.get('university')
    };

    const payload = role === 'student'
      ? {
        ...basePayload,
        course: formData.get('course'),
        branch: formData.get('branch'),
        current_year: formData.get('current_year'),
        graduation_year: formData.get('student_graduation_year')
      }
      : {
        ...basePayload,
        graduation_year: formData.get('alumni_graduation_year'),
        degree: formData.get('degree'),
        current_company: formData.get('current_company'),
        designation: formData.get('designation'),
        industry: formData.get('industry'),
        years_experience: formData.get('years_experience')
      };

    try {
      const data = await apiRequest(`/auth/register/${role}`, { method: 'POST', auth: false, body: payload });
      Auth.setToken(data.token);
      Auth.setUser(data.user);
      showToast('Account created! Redirecting to your dashboard...', 'success');
      setTimeout(() => { window.location.href = '/dashboard.html'; }, 700);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });
}

/* -------------------- FORGOT PASSWORD -------------------- */
function initForgotForm() {
  const form = document.getElementById('forgot-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const data = await apiRequest('/auth/forgot-password', { method: 'POST', auth: false, body: { email: formData.get('email') } });
      const resultBox = document.getElementById('forgot-result');
      if (data.resetUrl) {
        resultBox.innerHTML = `
          <p class="form-hint">Prototype mode: use this link to reset your password (in production this is emailed):</p>
          <a class="btn btn-outline btn-sm mt-1" href="${data.resetUrl}">Reset Password →</a>`;
        resultBox.style.display = 'block';
      }
      showToast(data.message, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

/* -------------------- RESET PASSWORD -------------------- */
function initResetForm() {
  const form = document.getElementById('reset-form');
  if (!form) return;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const password = formData.get('password');
    const confirm = formData.get('confirm_password');
    if (password !== confirm) { showToast('Passwords do not match.', 'error'); return; }
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await apiRequest('/auth/reset-password', { method: 'POST', auth: false, body: { token, password } });
      showToast('Password reset! Redirecting to login...', 'success');
      setTimeout(() => { window.location.href = '/login.html'; }, 1200);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
    }
  });
}
