const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const d = '\\x2e';
const forbidden = new RegExp(['rob'+'lox'+d+'com','rbx'+'cdn'+d+'com','web'+d+'archive'+d+'org','web-static'+d+'archive'+d+'org','rob'+'lox'+':'+'\\/\\/','auth'+d+'rob'+'lox','users'+d+'rob'+'lox','economy'+d+'rob'+'lox','catalog'+d+'rob'+'lox','games'+d+'rob'+'lox','create'+d+'rob'+'lox'].join('|'),'i');
const archiveMarkers = new RegExp(['way'+'back','_'+'_'+'wm','wom'+'bat','archive_'+'analytics','wm-'+'ipp'].join('|'),'i');
function attrs(html){ const out=[]; const re=/\b(href|src|action)=(["'])(.*?)\2/gi; let m; while((m=re.exec(html))) out.push({attr:m[1].toLowerCase(), value:m[3]}); return out; }
async function ok(route, opts={}) { const res = await fetch(BASE + route, { redirect:'manual', ...opts }); if (res.status >= 400) throw new Error(`${opts.method||'GET'} ${route} ${res.status}`); const loc=res.headers.get('location')||''; if (forbidden.test(loc)) throw new Error(`${route} forbidden redirect ${loc}`); return res; }
async function html(route) { const res = await ok(route); return await res.text(); }
async function main(){
  const pages = fs.readdirSync(path.join(ROOT,'archive','pages')).filter(f=>f.endsWith('.html'));
  const routes = new Set(['/','/home','/login','/signup','/catalog','/charts','/avatar','/inventory','/friends','/messages','/transactions','/trades','/settings','/redeem','/giftcards','/subscription','/groups','/users/89262109/profile']);
  for (const file of pages) {
    const route='/' + encodeURIComponent(file);
    routes.add(route);
    const body = await html(route);
    if (forbidden.test(body)) throw new Error(`${file} served forbidden remote URL`);
    if (archiveMarkers.test(body)) throw new Error(`${file} served archive artifact`);
    for (const a of attrs(body)) {
      if (forbidden.test(a.value)) throw new Error(`${file} forbidden served ${a.attr}: ${a.value}`);
      if ((a.attr === 'href' || a.attr === 'action') && a.value.startsWith('/') && !a.value.startsWith('/assets') && !a.value.startsWith('/local-assets') && !a.value.startsWith('/api')) routes.add((a.value.split('#')[0].split('?')[0] || '/'));
    }
  }
  for (const r of routes) await ok(r);
  let res = await ok('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'awoken',password:'password123'})});
  let json = await res.json(); if (!json.user || json.redirect !== '/home') throw new Error('login payload invalid');
  const cookie = (res.headers.get('set-cookie')||'').split(';')[0]; if (!cookie.startsWith('sid=')) throw new Error('login cookie missing');
  res = await ok('/api/session',{headers:{cookie}}); json=await res.json(); if (!json.user || json.user.username !== 'awoken') throw new Error('session invalid');
  await ok('/api/auth/logout',{method:'POST',headers:{cookie}});
  const username='tu'+String(Date.now()).slice(-10);
  res = await ok('/api/auth/signup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,password:'password123',email:`${username}@example.test`})});
  json=await res.json(); if(!json.user || json.user.username!==username) throw new Error('signup invalid');
  await ok('/api/games'); await ok('/api/catalog'); await ok('/api/local-compat',{method:'POST'}); await ok('/api/thumbnails/local');
  console.log(`validated served output for ${pages.length} pages and ${routes.size} local routes`);
}
main().catch(e=>{ console.error(e); process.exit(1); });
