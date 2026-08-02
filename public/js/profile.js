let profileData = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadProfile();
  initTabs();
  initFormHandlers();
});

async function loadProfile() {
  try {
    const { user } = await apiRequest('/auth/me');
    profileData = user;
    Auth.setUser({ ...Auth.getUser(), full_name: user.full_name, profile_picture: user.profile_picture });

    document.getElementById('profile-name').textContent = user.full_name;
    document.getElementById('profile-role').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    document.getElementById('profile-avatar').innerHTML = avatarHtml(user, 'avatar-lg');

    const form = document.getElementById('profile-form');
    form.full_name.value = user.full_name || '';
    form.phone.value = user.phone || '';
    form.location.value = user.location || '';
    form.linkedin_url.value = user.linkedin_url || '';
    form.bio.value = user.bio || '';
    form.skills.value = user.skills || '';

    if (user.role === 'student') {
      document.getElementById('student-only-fields').style.display = 'block';
      form.university.value = user.university || '';
      form.course.value = user.course || '';
      form.branch.value = user.branch || '';
      form.graduation_year.value = user.graduation_year || '';
      if (user.resume_url) {
        const link = document.getElementById('resume-link');
        link.href = user.resume_url; link.style.display = 'inline-flex';
      }
    } else if (user.role === 'alumni') {
      document.getElementById('alumni-only-fields').style.display = 'block';
      form.university.value = user.university || '';
      form.graduation_year.value = user.graduation_year || '';
      form.current_company.value = user.current_company || '';
      form.designation.value = user.designation || '';
      form.industry.value = user.industry || '';
      form.years_experience.value = user.years_experience || '';
      form.is_mentor_available.checked = !!user.is_mentor_available;
    }

    renderExperience(user.id);
  } catch (err) { showToast(err.message, 'error'); }
}

function initTabs() {
  document.querySelectorAll('.tabs .tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tabs .tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      ['details', 'experience', 'security'].forEach((t) => {
        document.getElementById(`tab-${t}`).style.display = t === btn.dataset.tab ? 'block' : 'none';
      });
    });
  });

  const params = new URLSearchParams(window.location.search);
  const presetTab = params.get('tab');
  if (presetTab) {
    const btn = document.querySelector(`.tabs .tab-btn[data-tab="${presetTab}"]`);
    if (btn) btn.click();
  }
}

function initFormHandlers() {
  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData);
    payload.is_mentor_available = formData.get('is_mentor_available') ? 1 : 0;
    try {
      await apiRequest('/profile', { method: 'PUT', body: payload });
      showToast('Profile updated successfully!', 'success');
      loadProfile();
    } catch (err) { showToast(err.message, 'error'); }
  });

  document.getElementById('picture-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('picture', file);
    try {
      const res = await apiRequest('/profile/picture', { method: 'POST', isForm: true, body: formData });
      showToast('Profile picture updated!', 'success');
      document.getElementById('profile-avatar').innerHTML = `<img class="avatar avatar-lg" src="${res.path}">`;
    } catch (err) { showToast(err.message, 'error'); }
  });

  document.getElementById('resume-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('resume', file);
    try {
      const res = await apiRequest('/profile/resume', { method: 'POST', isForm: true, body: formData });
      showToast('Resume uploaded!', 'success');
      const link = document.getElementById('resume-link');
      link.href = res.path; link.style.display = 'inline-flex';
    } catch (err) { showToast(err.message, 'error'); }
  });

  document.getElementById('experience-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await apiRequest('/profile/experience', { method: 'POST', body: Object.fromEntries(formData) });
      showToast('Experience added!', 'success');
      e.target.reset();
      renderExperience();
    } catch (err) { showToast(err.message, 'error'); }
  });

  document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await apiRequest('/profile/password', { method: 'PUT', body: Object.fromEntries(formData) });
      showToast('Password changed successfully!', 'success');
      e.target.reset();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

async function renderExperience() {
  const list = document.getElementById('experience-list');
  try {
    const { user } = await apiRequest('/auth/me');
    renderExpList(list, user.experience || []);
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Could not load experience.</div>`;
  }
}
function renderExpList(list, exp) {
  list.innerHTML = exp.length ? exp.map((e) => `
    <div class="timeline-item">
      <div class="flex-between" style="width:100%;">
        <div>
          <strong style="font-size:0.92rem;">${escapeHtml(e.title)}</strong>
          <p class="text-soft" style="font-size:0.82rem;">${escapeHtml(e.company)} · ${formatDate(e.start_date)} - ${e.is_current ? 'Present' : formatDate(e.end_date)}</p>
          <p class="text-soft" style="font-size:0.82rem;">${escapeHtml(e.description || '')}</p>
        </div>
        <button class="icon-btn danger" onclick="deleteExperience(${e.id})"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`).join('') : `<div class="empty-state">No experience added yet.</div>`;
}
async function deleteExperience(id) {
  try {
    await apiRequest(`/profile/experience/${id}`, { method: 'DELETE' });
    showToast('Experience removed.', 'success');
    renderExperience();
  } catch (err) { showToast(err.message, 'error'); }
}
