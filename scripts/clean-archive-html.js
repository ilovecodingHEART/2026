const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGE_DIR = path.join(ROOT, 'archive', 'pages');
const LOCALES = new Set(['de','es','fr','id','it','ja','ko','pl','pt','th','tr','vi','ar','hi','bn-in','zh-hans','mr','zh-hant','nl','pt-br','en-au','en-nz','ta','te']);

function unwrapWayback(value) {
  if (!value) return value;
  let out = value;
  out = out.replace(/https?:\/\/web\.archive\.org\/web\/\d+(?:[a-z_]+)?\/(https?:\/\/[^\s"'<>]+)/gi, '$1');
  out = out.replace(/\/web\/\d+(?:[a-z_]+)?\/(https?:\/\/[^\s"'<>]+)/gi, '$1');
  out = out.replace(/\/web\/\d+(?:[a-z_]+)?\/(\/[^\s"'<>]*)/gi, '$1');
  out = out.replace(/\/web\/\d+\//gi, '/');
  out = out.replace(/https?:\/\/web-static\.archive\.org\/[^\s"'<>]*/gi, '');
  return out;
}

function robloxLocalUrl(raw) {
  if (!raw) return raw;
  let value = unwrapWayback(raw);
  let hash = '';
  const hashIndex = value.indexOf('#');
  if (hashIndex !== -1) { hash = value.slice(hashIndex); value = value.slice(0, hashIndex); }
  try {
    const url = new URL(value, 'https://local.invalid');
    const host = url.hostname.toLowerCase();
    if (host === 'about.roblox.com') {
      let parts = url.pathname.split('/').filter(Boolean);
      if (parts.length && LOCALES.has(parts[0])) parts = parts.slice(1);
      const p = '/' + parts.join('/');
      return (p === '/' || p === '/newsroom' ? '/newsroom' : p) + url.search + hash;
    }
    if (host === 'careers.roblox.com') return '/careers';
    if (host === 'brands.roblox.com') return '/brands';
    if (host === 'research.roblox.com') return '/research';
    if (host === 'education.roblox.com') return '/education';
    if (host === 'ir.roblox.com') return '/investors';
    if (host === 'create.roblox.com') return '/develop';
    if (host === 'en.help.roblox.com') {
      const low = url.pathname.toLowerCase();
      if (low.includes('privacy') || low.includes('cookie')) return '/privacy';
      if (low.includes('terms')) return '/terms';
      if (low.includes('accessibility')) return '/accessibility';
      return '/help';
    }
    if (host === 'www.roblox.com' || host === 'roblox.com') {
      let parts = url.pathname.split('/').filter(Boolean);
      if (parts.length && LOCALES.has(parts[0])) parts = parts.slice(1);
      let p = '/' + parts.join('/');
      if (p === '/') return '/' + url.search + hash;
      const lower = p.toLowerCase();
      if (lower === '/login') p = '/login';
      else if (lower === '/giftcards-us' || lower === '/giftcards') p = '/giftcards';
      else if (lower === '/plus') p = '/subscription';
      else if (lower === '/upgrades/robux') p = '/upgrades/robux';
      else if (lower.startsWith('/communities/')) p = p.replace(/^\/communities\//i, '/groups/');
      return p + url.search + hash;
    }
    // Convert Roblox-owned script references to local stubs so pages do not call roblox.com.
    if (host === 'roblox.com' && url.pathname.startsWith('/js/')) return url.pathname + url.search + hash;
  } catch (_) {}
  return value;
}

function cleanHtml(html) {
  let out = html;
  out = out.replace(/<script\s+src="https:\/\/web-static\.archive\.org\/_static\/js\/athena\.js"[^>]*><\/script>\s*/gi, '');
  out = out.replace(/<script[^>]*>\s*window\.addEventListener\('DOMContentLoaded'[\s\S]*?archive_analytics\.send_pageview\([\s\S]*?<\/script>\s*/gi, '');
  out = out.replace(/<script[^>]+src="https:\/\/web-static\.archive\.org\/_static\/js\/(?:bundle-playback|wombat|ruffle\/ruffle)\.js[^>]*><\/script>\s*/gi, '');
  out = out.replace(/<script>window\.RufflePlayer[\s\S]*?<\/script>\s*/gi, '');
  out = out.replace(/<script[^>]*>\s*__wm\.[\s\S]*?<\/script>\s*/gi, '');
  out = out.replace(/<link[^>]+href="https:\/\/web-static\.archive\.org\/_static\/css\/(?:banner-styles|iconochive)\.css[^>]*>\s*/gi, '');
  out = out.replace(/<!--\s*(?:End Wayback Rewrite JS Include|BEGIN WAYBACK TOOLBAR INSERT|END WAYBACK TOOLBAR INSERT)[\s\S]*?-->/gi, '');
  out = out.replace(/<script>__wm\.rw\(0\);<\/script>[\s\S]*?<script>\s*__wm\.bt\([\s\S]*?__wm\.rw\(1\);\s*<\/script>\s*/gi, '');
  out = out.replace(/<div id="wm-ipp-base"[\s\S]*?<\/script>\s*/gi, '');
  out = out.replace(/<head\s+data-machine-id="([^"]*)"/i, '<head');
  out = unwrapWayback(out).replace(/\/\/web\.archive\.orghttps:\/\//g, 'https://');

  // Convert URL-bearing HTML attributes that point at roblox.com or Wayback-wrapped roblox.com.
  out = out.replace(/\b(href|src|action)=(['"])(.*?)\2/gi, (m, attr, quote, value) => {
    return `${attr}=${quote}${robloxLocalUrl(value)}${quote}`;
  });
  // Also localize absolute www.roblox.com values in JSON blobs and inline scripts where they are page URLs.
  out = out.replace(/https?:\/\/(?:www\.)?roblox\.com\/[A-Za-z0-9_\-./?=&%#]*/gi, m => robloxLocalUrl(m));
  const htmlEnd = out.toLowerCase().indexOf('</html>');
  if (htmlEnd !== -1) out = out.slice(0, htmlEnd + 7) + '\n';
  return out;
}

function main() {
  fs.mkdirSync(PAGE_DIR, { recursive: true });
  const rootHtml = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).map(file => [file, path.join(ROOT, file), true]);
  const pageHtml = fs.existsSync(PAGE_DIR) ? fs.readdirSync(PAGE_DIR).filter(f => f.endsWith('.html')).map(file => [file, path.join(PAGE_DIR, file), false]) : [];
  for (const [file, sourcePath, removeSource] of [...rootHtml, ...pageHtml]) {
    const newPath = path.join(PAGE_DIR, file);
    const cleaned = cleanHtml(fs.readFileSync(sourcePath, 'utf8'));
    fs.writeFileSync(newPath, cleaned);
    if (removeSource && sourcePath !== newPath) fs.unlinkSync(sourcePath);
    console.log(`cleaned ${file}`);
  }
}

if (require.main === module) main();
module.exports = { cleanHtml, robloxLocalUrl, unwrapWayback };
