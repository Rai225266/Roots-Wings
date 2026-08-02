const currentUser = Auth.getUser();
let activeContactId = null;
let inboxCache = [];
let pollTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadInbox();

  const params = new URLSearchParams(window.location.search);
  const toId = params.get('to');
  if (toId) {
    openConversation(toId, null, null, null);
  }

  document.getElementById('chat-list').addEventListener('click', (e) => {
    const item = e.target.closest('.chat-list-item');
    if (!item) return;
    openConversation(item.dataset.contactId, item.dataset.contactName, item.dataset.contactPicture, item.dataset.contactRole);
  });

  document.getElementById('new-msg-btn').addEventListener('click', () => {
    document.getElementById('new-msg-modal').classList.add('open');
    document.getElementById('user-search-input').value = '';
    document.getElementById('user-search-results').innerHTML = '<p class="text-soft" style="font-size:0.85rem;">Start typing a name or email above.</p>';
    setTimeout(() => document.getElementById('user-search-input').focus(), 100);
  });
  document.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.remove('open')));
  document.querySelectorAll('.modal-overlay').forEach((overlay) => overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); }));

  document.getElementById('user-search-input').addEventListener('input', debounce(searchUsers, 350));
  document.getElementById('user-search-results').addEventListener('click', (e) => {
    const item = e.target.closest('.search-result-item');
    if (!item) return;
    document.getElementById('new-msg-modal').classList.remove('open');
    openConversation(item.dataset.id, item.dataset.name, item.dataset.picture, item.dataset.role);
  });

  pollTimer = setInterval(() => {
    loadInbox(true);
    if (activeContactId) loadConversation(activeContactId, true);
  }, 8000);
});

async function searchUsers() {
  const q = document.getElementById('user-search-input').value.trim();
  const resultsEl = document.getElementById('user-search-results');
  if (!q) {
    resultsEl.innerHTML = '<p class="text-soft" style="font-size:0.85rem;">Start typing a name or email above.</p>';
    return;
  }
  resultsEl.innerHTML = '<div class="loading-state" style="padding:20px 0;"><span class="spinner"></span></div>';
  try {
    const { data } = await apiRequest(`/messages/search-users?q=${encodeURIComponent(q)}`);
    resultsEl.innerHTML = data.length ? data.map((u) => `
      <div class="search-result-item" data-id="${u.id}" data-name="${escapeHtml(u.full_name)}" data-picture="${u.profile_picture || ''}" data-role="${u.role}">
        ${avatarHtml(u)}
        <div class="meta"><strong>${escapeHtml(u.full_name)}</strong><span>${escapeHtml(u.role)} · ${escapeHtml(u.email)}</span></div>
      </div>`).join('') : '<p class="text-soft" style="font-size:0.85rem;">No matching people found.</p>';
  } catch (err) {
    resultsEl.innerHTML = `<p class="text-soft" style="font-size:0.85rem;">${err.message}</p>`;
  }
}

async function loadInbox(silent = false) {
  const list = document.getElementById('chat-list');
  if (!silent) list.innerHTML = '<div class="loading-state"><span class="spinner"></span>Loading conversations...</div>';
  try {
    const { data } = await apiRequest('/messages/inbox');
    inboxCache = data;
    if (!data.length) {
      list.innerHTML = `<div class="empty-state"><i class="fa-regular fa-address-book"></i><p style="font-size:0.85rem;">No conversations yet.<br>Tap "New" above to message someone.</p></div>`;
      return;
    }
    list.innerHTML = data.map((c) => `
      <div class="chat-list-item ${String(activeContactId) === String(c.contact_id) ? 'active' : ''}"
           data-contact-id="${c.contact_id}" data-contact-name="${escapeHtml(c.contact_name)}"
           data-contact-picture="${c.contact_picture || ''}" data-contact-role="${c.contact_role}">
        ${avatarHtml({ full_name: c.contact_name, profile_picture: c.contact_picture })}
        <div class="meta">
          <strong>${escapeHtml(c.contact_name)}</strong>
          <p>${escapeHtml(c.last_message || '')}</p>
        </div>
        <div style="text-align:right;">
          <div class="time">${timeAgo(c.last_message_at)}</div>
          ${c.unread_count > 0 ? `<span class="unread-badge">${c.unread_count}</span>` : ''}
        </div>
      </div>`).join('');
  } catch (err) {
    if (!silent) list.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

async function openConversation(contactId, name, picture, role) {
  activeContactId = contactId;
  document.querySelectorAll('.chat-list-item').forEach((el) => el.classList.toggle('active', String(el.dataset.contactId) === String(contactId)));

  let contactMeta = { name, picture, role };
  if (!name) {
    try {
      const { data } = await apiRequest(`/messages/contact/${contactId}/info`);
      contactMeta = { name: data.full_name, picture: data.profile_picture, role: data.role };
    } catch (err) {
      showToast('Could not load that contact.', 'error');
      return;
    }
  }
  await loadConversation(contactId, false, contactMeta);
  loadInbox(true);
}

async function loadConversation(contactId, silent = false, contactMeta = null) {
  const win = document.getElementById('chat-window');
  if (!silent) {
    win.innerHTML = `
      <div class="chat-header" id="chat-header"></div>
      <div class="chat-messages" id="chat-messages"><div class="loading-state"><span class="spinner"></span></div></div>
      <form class="chat-input-row" id="chat-input-form">
        <input class="form-control" id="chat-input" placeholder="Type a message..." autocomplete="off">
        <button class="btn btn-solid" type="submit"><i class="fa-solid fa-paper-plane"></i></button>
      </form>`;
    document.getElementById('chat-input-form').addEventListener('submit', sendMessage);

    const header = document.getElementById('chat-header');
    if (contactMeta?.name) {
      header.innerHTML = `${avatarHtml({ full_name: contactMeta.name, profile_picture: contactMeta.picture })}<div><strong style="font-size:0.92rem;">${escapeHtml(contactMeta.name)}</strong><p class="text-soft" style="font-size:0.76rem; text-transform:capitalize;">${contactMeta.role || ''}</p></div>`;
    } else {
      header.innerHTML = `<div><strong style="font-size:0.92rem;">Conversation</strong></div>`;
    }
  }
  try {
    const { data } = await apiRequest(`/messages/${contactId}`);
    const messagesEl = document.getElementById('chat-messages');
    if (messagesEl) {
      messagesEl.innerHTML = data.length ? data.map((m) => `
        <div class="msg-bubble ${String(m.sender_id) === String(currentUser.id) ? 'sent' : 'received'}">
          ${escapeHtml(m.message)}
          <span class="msg-time">${timeAgo(m.created_at)}</span>
        </div>`).join('') : `<div class="chat-empty"><p>Say hello 👋</p></div>`;
      if (!silent) messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function sendMessage(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message || !activeContactId) return;
  input.value = '';
  try {
    await apiRequest('/messages', { method: 'POST', body: { receiver_id: activeContactId, message } });
    await loadConversation(activeContactId, false);
    loadInbox(false);
  } catch (err) { showToast(err.message, 'error'); }
}
