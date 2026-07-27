const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const forbidden = /(roblox\.com|rbxcdn\.com|web\.archive\.org|web-static\.archive\.org|roblox:\/\/|auth\.roblox|users\.roblox|economy\.roblox|catalog\.roblox|games\.roblox|create\.roblox)/i;

function getCookie(setCookie) {
  return (setCookie || []).map(v => v.split(';')[0]).join('; ');
}
function attrs(html) {
  const out = [];
  const re = /\b(href|src|action)=(["'])(.*?)\2/gi;
  let m;
  while ((m = re.exec(html))) out.push({ attr: m[1].toLowerCase(), value: m[3] });
  return out;
}
async function checkHttp(route, method = 'GET', options = {}) {
  const res = await fetch(BASE + route, { method, redirect: 'manual', ...options });
  if (res.status >= 400) throw new Error(`${method} ${route} returned ${res.status}`);
  const loc = res.headers.get('location') || '';
  if (forbidden.test(loc)) throw new Error(`${method} ${route} redirects to forbidden URL ${loc}`);
  return res;
}

async function main() {
  const pages = fs.readdirSync(path.join(ROOT, 'archive', 'pages')).filter(f => f.endsWith('.html'));
  const routeSet = new Set(pages.map(file => '/' + encodeURIComponent(file)).concat(['/','/home','/login','/signup','/catalog','/charts','/avatar','/inventory','/friends','/messages','/transactions','/trades','/settings','/redeem','/giftcards','/subscription','/groups','/users/89262109/profile']));
  for (const file of pages) {
    const html = fs.readFileSync(path.join(ROOT, 'archive', 'pages', file), 'utf8');
    if (forbidden.test(html)) throw new Error(`${file} contains forbidden URL/domain`);
    for (const a of attrs(html)) {
      if (/^https?:\/\//i.test(a.value) || /^\/\//.test(a.value)) throw new Error(`${file} has external ${a.attr}: ${a.value}`);
      if ((a.attr === 'href' || a.attr === 'action') && a.value.startsWith('/') && !a.value.startsWith('/offline-assets') && !a.value.startsWith('/assets') && !a.value.startsWith('/api')) {
        routeSet.add(a.value.split('#')[0].split('?')[0] || '/');
      }
    }
  }
  for (const route of routeSet) await checkHttp(route);

  let res = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'awoken', password: 'password123' }), redirect: 'manual' });
  if (res.status !== 200) throw new Error(`login failed with ${res.status}: ${await res.text()}`);
  let data = await res.json();
  if (!data.user || data.redirect !== '/home') throw new Error('login returned unexpected payload');
  const cookie = getCookie(res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean));
  if (!cookie.includes('sid=')) throw new Error('login did not set sid cookie');
  res = await fetch(BASE + '/api/session', { headers: { cookie } });
  data = await res.json();
  if (!data.user || data.user.username !== 'awoken') throw new Error('session cookie did not authenticate');
  res = await fetch(BASE + '/api/auth/logout', { method: 'POST', headers: { cookie } });
  if (res.status !== 200) throw new Error('logout failed');

  const username = 'tu' + String(Date.now()).slice(-10);
  res = await fetch(BASE + '/api/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password: 'password123', email: `${username}@example.test` }) });
  if (res.status !== 200) throw new Error(`signup failed with ${res.status}: ${await res.text()}`);
  data = await res.json();
  if (!data.user || data.user.username !== username) throw new Error('signup returned unexpected payload');

  await checkHttp('/api/games');
  await checkHttp('/api/catalog');
  console.log(`Validated ${pages.length} pages, ${routeSet.size} local routes, login, signup, logout, and core APIs.`);
}

main().catch(err => { console.error(err); process.exit(1); });
