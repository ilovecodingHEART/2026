(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const api = (url, options = {}) => fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options, body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body }).then(async r => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || data.message || 'Request failed');
    return data;
  });
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const img = url => esc(url || '/local-assets/placeholder.svg');

  const style = document.createElement('style');
  style.textContent = `.archive-shell{max-width:1180px;margin:0 auto;padding:24px;color:#f2f4f5;font-family:BuilderSans,Arial,sans-serif}.archive-card{background:#272930;border:1px solid #393b44;border-radius:8px;padding:18px;margin:12px 0}.archive-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:16px}.archive-tile{background:#272930;border-radius:8px;padding:12px;border:1px solid #393b44}.archive-tile img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:6px;background:#393b44}.archive-game img{aspect-ratio:16/9}.archive-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.archive-btn{background:#335fff;color:white;border:0;border-radius:8px;padding:9px 14px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block}.archive-btn.secondary{background:#393b44}.archive-btn.danger{background:#d93636}.archive-input{background:#191b22;color:#f2f4f5;border:1px solid #555861;border-radius:8px;padding:10px;margin:5px 0;min-width:220px}.archive-muted{color:#b8b8c0}.archive-error{color:#ff8080}.archive-success{color:#6ee78f}.archive-list{display:grid;gap:10px}.archive-avatar{width:88px;height:88px;border-radius:50%;background:#393b44}.archive-topbar{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:18px}`;
  document.head.appendChild(style);

  async function session() { return api('/api/session').catch(() => ({ user: null })); }
  function setStatus(el, msg, cls = '') { const n = $('.archive-status', el) || document.createElement('div'); n.className = 'archive-status ' + cls; n.textContent = msg; if (!n.parentNode) el.appendChild(n); }
  function isEmpty(el) { return el && !el.textContent.trim() && el.children.length === 0; }

  function authBox(mode = 'login') {
    return `<div class="archive-shell"><div class="archive-card" style="max-width:420px;margin:40px auto"><h1>${mode === 'signup' ? 'Sign Up and Start Having Fun!' : 'Login to Roblox'}</h1><form id="archive-auth-form"><input class="archive-input" name="username" placeholder="Username" autocomplete="username" required><input class="archive-input" name="password" type="password" placeholder="Password" autocomplete="current-password" required>${mode === 'signup' ? '<input class="archive-input" name="email" type="email" placeholder="Email (optional)"><input class="archive-input" name="birthdate" type="date" placeholder="Birthday">' : ''}<button class="archive-btn" type="submit">${mode === 'signup' ? 'Sign Up' : 'Log In'}</button></form><p class="archive-muted">Demo account: <b>awoken</b> / <b>password123</b></p><p><a href="${mode === 'signup' ? '/login' : '/signup'}">${mode === 'signup' ? 'Already have an account?' : 'Create an account'}</a></p><div class="archive-status"></div></div></div>`;
  }
  async function renderLogin(root, signup = false) {
    root.innerHTML = authBox(signup ? 'signup' : 'login');
    $('#archive-auth-form', root).addEventListener('submit', async e => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.currentTarget));
      try { const r = await api(signup ? '/api/auth/signup' : '/api/auth/login', { method: 'POST', body }); location.href = r.redirect || '/home'; }
      catch (err) { setStatus(root, err.message, 'archive-error'); }
    });
  }
  async function top(root, title) {
    const { user } = await session();
    return `<div class="archive-topbar"><div><h1>${title}</h1>${user ? `<div class="archive-muted">Logged in as ${esc(user.display_name || user.username)} · ${esc(user.robux_balance)} Robux</div>` : '<div class="archive-muted">Not logged in</div>'}</div><div>${user ? '<button id="archive-logout" class="archive-btn secondary">Log Out</button>' : '<a class="archive-btn" href="/login">Log In</a>'}</div></div>`;
  }
  function bindLogout(root) { const b = $('#archive-logout', root); if (b) b.onclick = () => api('/api/auth/logout', { method: 'POST' }).then(() => location.href = '/login'); }

  async function renderHome(root) {
    const games = (await api('/api/games')).data;
    root.innerHTML = `<div class="archive-shell">${await top(root, 'Home')}<h2>Recommended Experiences</h2><div class="archive-grid">${games.map(g => `<div class="archive-tile archive-game"><img src="${img(g.thumbnail_url)}"><h3>${esc(g.title)}</h3><div class="archive-muted">${esc(g.playing.toLocaleString())} active · ${esc(g.visits.toLocaleString())} visits</div><button class="archive-btn" data-play="${g.id}">Play</button></div>`).join('')}</div></div>`;
    bindLogout(root); $$('[data-play]', root).forEach(b => b.onclick = () => api(`/api/games/${b.dataset.play}/play`, { method: 'POST' }).then(r => alert('Launching experience: ' + r.launchUrl)).catch(e => alert(e.message)));
  }
  async function renderCatalog(root) {
    const items = (await api('/api/catalog')).data;
    root.innerHTML = `<div class="archive-shell">${await top(root, 'Marketplace')}<div class="archive-grid">${items.map(i => `<div class="archive-tile"><img src="${img(i.thumbnail_url)}"><h3>${esc(i.name)}</h3><div class="archive-muted">${esc(i.item_type)} · ${esc(i.creator_name || 'Roblox')}</div><b>${esc(i.price_robux)} Robux</b><br><button class="archive-btn" data-buy="${i.id}">Buy</button></div>`).join('')}</div></div>`;
    bindLogout(root); $$('[data-buy]', root).forEach(b => b.onclick = () => api(`/api/catalog/${b.dataset.buy}/buy`, { method: 'POST' }).then(() => { alert('Purchased'); renderCatalog(root); }).catch(e => alert(e.message)));
  }
  async function renderInventory(root) {
    try { const items = (await api('/api/inventory')).data; root.innerHTML = `<div class="archive-shell">${await top(root, 'Inventory')}<div class="archive-grid">${items.map(i => `<div class="archive-tile"><img src="${img(i.thumbnail_url)}"><h3>${esc(i.name)}</h3><div class="archive-muted">${esc(i.item_type)}</div></div>`).join('') || '<div class="archive-card">No items yet.</div>'}</div></div>`; bindLogout(root); } catch { root.innerHTML = `<div class="archive-shell"><div class="archive-card">Please <a href="/login">log in</a> to view inventory.</div></div>`; }
  }
  async function renderFriends(root) {
    try { const friends = (await api('/api/friends')).data; const users = (await api('/api/users')).data; root.innerHTML = `<div class="archive-shell">${await top(root, 'Friends')}<div class="archive-card"><h2>Add Friend</h2>${users.map(u => `<button class="archive-btn secondary" data-friend="${u.id}">${esc(u.display_name)}</button> `).join('')}</div><div class="archive-list">${friends.map(f => `<div class="archive-card archive-row"><img class="archive-avatar" src="${img()}"/><div><h3>${esc(f.display_name)}</h3><div class="archive-muted">@${esc(f.username)}</div></div></div>`).join('') || '<div class="archive-card">No friends yet.</div>'}</div></div>`; bindLogout(root); $$('[data-friend]', root).forEach(b => b.onclick = () => api('/api/friends/request', { method: 'POST', body: { userId: b.dataset.friend } }).then(() => alert('Friend request sent')).catch(e => alert(e.message))); } catch { root.innerHTML = `<div class="archive-shell"><div class="archive-card">Please <a href="/login">log in</a> to view friends.</div></div>`; }
  }
  async function renderMessages(root) {
    try { const msgs = (await api('/api/messages')).data; root.innerHTML = `<div class="archive-shell">${await top(root, 'Messages')}<div class="archive-card"><h2>Send Message</h2><form id="msg"><input class="archive-input" name="to" placeholder="Recipient username"><input class="archive-input" name="subject" placeholder="Subject"><textarea class="archive-input" name="body" placeholder="Message"></textarea><button class="archive-btn">Send</button></form></div>${msgs.map(m => `<div class="archive-card"><b>${esc(m.subject || '(no subject)')}</b><div class="archive-muted">${esc(m.sender_name)} → ${esc(m.recipient_name)} · ${esc(m.created_at)}</div><p>${esc(m.body)}</p></div>`).join('')}</div>`; bindLogout(root); $('#msg', root).onsubmit = e => { e.preventDefault(); api('/api/messages', { method: 'POST', body: Object.fromEntries(new FormData(e.currentTarget)) }).then(() => renderMessages(root)).catch(err => alert(err.message)); }; } catch { root.innerHTML = `<div class="archive-shell"><div class="archive-card">Please <a href="/login">log in</a> to view messages.</div></div>`; }
  }
  async function renderProfile(root) {
    const id = (location.pathname.match(/users\/(\d+)/)||[])[1] || 1; const u = await api('/api/users/' + id).catch(() => null);
    root.innerHTML = `<div class="archive-shell">${await top(root, 'Profile')}<div class="archive-card archive-row"><img class="archive-avatar" src="${img(u?.avatar_url)}"><div><h1>${esc(u?.display_name || 'User')}</h1><div class="archive-muted">@${esc(u?.username || '')}</div><p>${esc(u?.about || '')}</p><b>${esc(u?.status || '')}</b></div></div></div>`; bindLogout(root);
  }
  async function renderSettings(root) { try { const s = await api('/api/settings'); root.innerHTML = `<div class="archive-shell">${await top(root, 'Settings')}<form class="archive-card" id="settings"><label>Theme <input class="archive-input" name="theme" value="${esc(s.theme)}"></label><label>Language <input class="archive-input" name="language" value="${esc(s.language)}"></label><button class="archive-btn">Save</button><span class="archive-status"></span></form></div>`; bindLogout(root); $('#settings', root).onsubmit = e => { e.preventDefault(); api('/api/settings', { method: 'PUT', body: Object.fromEntries(new FormData(e.currentTarget)) }).then(() => setStatus(root, 'Saved', 'archive-success')).catch(err => setStatus(root, err.message, 'archive-error')); }; } catch { root.innerHTML = `<div class="archive-shell"><div class="archive-card">Please <a href="/login">log in</a>.</div></div>`; } }
  async function renderSimple(root, title, endpoint) { try { const data = (await api(endpoint)).data || []; root.innerHTML = `<div class="archive-shell">${await top(root, title)}${data.map(x => `<div class="archive-card"><pre style="white-space:pre-wrap;color:inherit">${esc(JSON.stringify(x, null, 2))}</pre></div>`).join('') || '<div class="archive-card">Nothing to show yet.</div>'}</div>`; bindLogout(root); } catch { root.innerHTML = `<div class="archive-shell"><div class="archive-card">Please <a href="/login">log in</a>.</div></div>`; } }
  async function renderRedeem(root) { root.innerHTML = `<div class="archive-shell">${await top(root, 'Redeem Roblox Gift Cards and Codes')}<form class="archive-card" id="redeem"><input class="archive-input" name="code" placeholder="Code" value="BOBLOX-2026-DEMO"><button class="archive-btn">Redeem</button><div class="archive-status archive-muted">Seed code: BOBLOX-2026-DEMO</div></form></div>`; bindLogout(root); $('#redeem', root).onsubmit = e => { e.preventDefault(); api('/api/giftcards/redeem', { method: 'POST', body: Object.fromEntries(new FormData(e.currentTarget)) }).then(r => setStatus(root, `Redeemed ${r.amount} Robux`, 'archive-success')).catch(err => setStatus(root, err.message, 'archive-error')); }; }
  async function renderRobux(root) { root.innerHTML = `<div class="archive-shell">${await top(root, 'Buy Robux')}<div class="archive-grid">${[400,800,1700,4500,10000].map(n => `<div class="archive-tile"><h2>${n} Robux</h2><button class="archive-btn" data-robux="${n}">Buy</button></div>`).join('')}</div></div>`; bindLogout(root); $$('[data-robux]', root).forEach(b => b.onclick = () => api('/api/robux/purchase', { method: 'POST', body: { amount: b.dataset.robux } }).then(() => renderRobux(root)).catch(e => alert(e.message))); }

  function wireSearchForms() {
    $$('form').forEach(f => {
      if (f.dataset.archiveWired) return; f.dataset.archiveWired = '1';
      if (!f.action || f.id === 'global-search' || f.id === 'nav-search-bar-form') f.addEventListener('submit', e => { const q = new FormData(f).get('search') || new FormData(f).get('field-keywords') || ''; if (q) { e.preventDefault(); location.href = '/catalog?q=' + encodeURIComponent(q); } });
    });
  }
  function patchLinks() { $$('a[href^="/local-assets/placeholder.svg"],a[href^="/local-assets/placeholder.svg"]').forEach(a => { try { a.href = new URL(a.href).pathname; } catch {} }); }

  async function boot() {
    patchLinks(); wireSearchForms();
    await new Promise(r => setTimeout(r, 1400));
    const routes = [
      ['#react-login-web-app', () => renderLogin($('#react-login-web-app'), false)],
      ['#react-landing-container', () => renderLogin($('#react-landing-container'), true)],
      ['#places-list-web-app,#game-carousel-web-app', () => renderHome($('#places-list-web-app') || $('#game-carousel-web-app'))],
      ['#catalog-react-container', () => renderCatalog($('#catalog-react-container'))],
      ['#inventory-container,#avatar-web-app', () => renderInventory($('#inventory-container') || $('#avatar-web-app'))],
      ['#friends-web-app', () => renderFriends($('#friends-web-app'))],
      ['#private-message-web-app', () => renderMessages($('#private-message-web-app'))],
      ['#transactions-web-app', () => renderSimple($('#transactions-web-app'), 'My Transactions', '/api/transactions')],
      ['#trades-web-app', () => renderSimple($('#trades-web-app'), 'Trade', '/api/trades')],
      ['#notification-settings', () => renderSettings($('#notification-settings'))],
      ['#redeem-gift-card-container,#redeem-gift-card', () => renderRedeem($('#redeem-gift-card-container') || $('#redeem-gift-card'))],
      ['#robux-redesign-page,#robux-container-base', () => renderRobux($('#robux-redesign-page') || $('#robux-container-base'))],
      ['#group-container', () => renderSimple($('#group-container'), 'Groups', '/api/groups')]
    ];
    for (const [sel, fn] of routes) { const root = $(sel); if (isEmpty(root)) return fn(); }
    if (/\/users\/\d+\/profile/.test(location.pathname) && $('#container-main')) renderProfile($('#container-main'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
