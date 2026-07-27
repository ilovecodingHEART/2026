const path = require('path');
const ROOT_DIR = path.join(__dirname, '..', '..');
require('dotenv').config({ path: path.join(ROOT_DIR, '.env') });
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const { openDatabase } = require('../db/sqljs');

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DATABASE_URL || path.join(ROOT_DIR, 'data', 'site.sqlite');
const SESSION_SECRET = process.env.SESSION_SECRET || 'development-secret';

let db;
async function main() {
if (!fs.existsSync(DB_PATH)) await require('../../scripts/init-db')();
db = await openDatabase(DB_PATH);
db.pragma('foreign_keys = ON');

const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(SESSION_SECRET));
app.use('/assets', express.static(path.join(ROOT_DIR, 'public', 'assets'), { maxAge: '1h' }));
app.use('/offline-assets', express.static(path.join(ROOT_DIR, 'public', 'offline-assets'), { maxAge: '1h' }));

const pageMap = new Map(Object.entries({
  '/': 'boblox - signup.html',
  '/home': 'Home - boblox.html',
  '/login': 'Log in to Roblox.html',
  '/Login': 'Log in to Roblox.html',
  '/newlogin': 'Log in to Roblox.html',
  '/signup': 'boblox - signup.html',
  '/catalog': 'Catalog.html',
  '/marketplace': 'Catalog.html',
  '/charts': 'Top Roblox Games.html',
  '/games': 'Top Roblox Games.html',
  '/discover': 'Top Roblox Games.html',
  '/avatar': 'Avatar - Roblox.html',
  '/my/avatar': 'Avatar - Roblox.html',
  '/inventory': 'Inventory - Roblox.html',
  '/users/inventory': 'Inventory - Roblox.html',
  '/friends': 'Friends - Roblox.html',
  '/users/friends': 'Friends - Roblox.html',
  '/messages': 'Roblox - messages.html',
  '/my/messages': 'Roblox - messages.html',
  '/transactions': 'My Transactions - Roblox.html',
  '/my/transactions': 'My Transactions - Roblox.html',
  '/my/money': 'My Transactions - Roblox.html',
  '/trade': 'Trade - Roblox.html',
  '/trades': 'Trade - Roblox.html',
  '/groups': 'groups- Roblox.html',
  '/settings': 'Settings - Roblox.html',
  '/my/account': 'Settings - Roblox.html',
  '/help': 'Help & Safety - Roblox.html',
  '/help-and-safety': 'Help & Safety - Roblox.html',
  '/help-safety': 'Help & Safety - Roblox.html',
  '/giftcards': 'Roblox Gift Cards.html',
  '/giftcards-us': 'Roblox Gift Cards.html',
  '/gift-cards': 'Roblox Gift Cards.html',
  '/redeem': 'Redeem Roblox Gift Cards and Codes.html',
  '/redeem-gift-card': 'Redeem Roblox Gift Cards and Codes.html',
  '/premium/membership': 'Roblox Subscription.html',
  '/subscription': 'Roblox Subscription.html',
  '/upgrades/robux': 'Buy Robux.html',
  '/robux': 'Buy Robux.html',
  '/develop': 'Roblox Creator Hub.html',
  '/create': 'Roblox Creator Hub.html',
  '/creator-hub': 'Roblox Creator Hub.html',
  '/news': 'Newsroom _ Robloxakablog.html',
  '/newsroom': 'Newsroom _ Robloxakablog.html',
  '/blog': 'Newsroom _ Robloxakablog.html',
  '/amazon': 'Amazon.com_ BOBLOX.html',
  '/impact': 'Newsroom _ Robloxakablog.html',
  '/leadership': 'Newsroom _ Robloxakablog.html',
  '/values': 'Newsroom _ Robloxakablog.html',
  '/podcast': 'Newsroom _ Robloxakablog.html',
  '/education': 'Newsroom _ Robloxakablog.html',
  '/contact': 'Newsroom _ Robloxakablog.html',
  '/press-kit': 'Newsroom _ Robloxakablog.html',
  '/safety': 'Help & Safety - Roblox.html',
  '/publications': 'Newsroom _ Robloxakablog.html',
  '/careers': 'Newsroom _ Robloxakablog.html',
  '/brands': 'Newsroom _ Robloxakablog.html',
  '/research': 'Newsroom _ Robloxakablog.html',
  '/investors': 'Newsroom _ Robloxakablog.html',
  '/terms': 'Help & Safety - Roblox.html',
  '/privacy': 'Help & Safety - Roblox.html',
  '/accessibility': 'Help & Safety - Roblox.html'
}));

function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
}
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return `pbkdf2$120000$${salt}$${hash}`;
}
function verifyPassword(password, stored) {
  const [, iter, salt, hash] = String(stored || '').split('$');
  if (!salt || !hash) return false;
  const check = crypto.pbkdf2Sync(password, salt, Number(iter), 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(check), Buffer.from(hash));
}
function publicUser(row) {
  if (!row) return null;
  const { password_hash, email, ...safe } = row;
  safe.email = email || null;
  return safe;
}
function getCurrentUser(req) {
  const sid = req.signedCookies.sid;
  if (!sid) return null;
  const sess = db.prepare('SELECT * FROM sessions WHERE id=? AND expires_at > CURRENT_TIMESTAMP').get(sid);
  if (!sess) return null;
  const user = db.prepare('SELECT u.*, p.about, p.status, p.avatar_url FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE u.id=?').get(sess.user_id);
  return user || null;
}
function requireUser(req, res, next) {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  req.user = user;
  next();
}
function createSession(res, user, req) {
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent) VALUES (?, ?, datetime(CURRENT_TIMESTAMP, "+30 days"), ?, ?)')
    .run(id, user.id, req.ip, req.get('user-agent') || '');
  res.cookie('sid', id, { signed: true, httpOnly: true, sameSite: 'lax', maxAge: 30 * 86400 * 1000 });
}
function htmlResponse(file, req) {
  const full = path.join(ROOT_DIR, 'archive', 'pages', file);
  let html = fs.readFileSync(full, 'utf8');
  const boot = `<script>window.__ARCHIVE_PAGE__=${JSON.stringify({ path: req.path, file })}</script><script src="/assets/archive-app.js" defer></script>`;
  return html.includes('</body>') ? html.replace('</body>', `${boot}</body>`) : html + boot;
}
function resolvePage(reqPath) {
  const clean = reqPath.replace(/\/$/, '') || '/';
  if (pageMap.has(clean)) return pageMap.get(clean);
  const decoded = decodeURIComponent(clean.slice(1));
  if (fs.existsSync(path.join(ROOT_DIR, 'archive', 'pages', decoded))) return decoded;
  if (/^\/users\/\d+\/profile/.test(clean)) return 'profile - Roblox.html';
  if (/^\/users\/\d+\/inventory/.test(clean)) return 'Inventory - Roblox.html';
  if (/^\/groups\/\d+/.test(clean)) return 'groups- Roblox.html';
  if (/^\/games\/\d+/.test(clean)) return 'Top Roblox Games.html';
  if (/^\/catalog\//.test(clean)) return 'Catalog.html';
  if (/^\/(gp|b|hz|stores|customer-preferences|prime|deals|Amazon_Basics|haul|fmc|alm|Roblox-|Robux-|dp|music|books-|home-garden|automotive|toys|Tools-|baby-|sports-|Smart-Home|finds|Kindle-|luxurystores|everyday-essentials|amazonfresh)\b/.test(clean)) return 'Amazon.com_ BOBLOX.html';
  return null;
}

app.use((req, res, next) => {
  req.user = getCurrentUser(req);
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true, database: fs.existsSync(DB_PATH) }));
app.get('/api/session', (req, res) => res.json({ user: publicUser(req.user) }));

app.post('/api/auth/signup', (req, res) => {
  const username = String(req.body.username || '').trim().replace(/[^A-Za-z0-9_]/g, '').slice(0, 20);
  const password = String(req.body.password || req.body.Password || '');
  const email = String(req.body.email || '').trim() || null;
  const birthdate = req.body.birthdate || [req.body.birthYear, req.body.birthMonth, req.body.birthDay].filter(Boolean).join('-') || null;
  if (username.length < 3 || password.length < 6) return res.status(400).json({ error: 'Username must be 3+ characters and password 6+ characters.' });
  try {
    const info = db.prepare('INSERT INTO users (username, display_name, email, password_hash, birthdate, robux_balance) VALUES (?, ?, ?, ?, ?, 0)')
      .run(username, username, email, hashPassword(password), birthdate);
    db.prepare('INSERT INTO profiles (user_id, status, about) VALUES (?, "Online", "")').run(info.lastInsertRowid);
    db.prepare('INSERT INTO settings (user_id) VALUES (?)').run(info.lastInsertRowid);
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid);
    createSession(res, user, req);
    res.json({ user: publicUser(user), redirect: '/home' });
  } catch (e) { res.status(409).json({ error: 'That username or email is already in use.' }); }
});

app.post('/api/auth/login', (req, res) => {
  const login = String(req.body.username || req.body.login || req.body.email || '').trim();
  const password = String(req.body.password || '');
  const user = db.prepare('SELECT * FROM users WHERE lower(username)=lower(?) OR lower(email)=lower(?)').get(login, login);
  if (!user || !verifyPassword(password, user.password_hash)) return res.status(401).json({ error: 'Incorrect username or password.' });
  createSession(res, user, req);
  res.json({ user: publicUser(user), redirect: '/home' });
});
app.post('/api/auth/logout', requireUser, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE id=?').run(req.signedCookies.sid);
  res.clearCookie('sid');
  res.json({ ok: true, redirect: '/login' });
});
app.post('/api/auth/password-reset', (req, res) => {
  const login = String(req.body.email || req.body.username || '').trim();
  const user = db.prepare('SELECT * FROM users WHERE lower(username)=lower(?) OR lower(email)=lower(?)').get(login, login);
  if (user) db.prepare('INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, datetime(CURRENT_TIMESTAMP, "+1 hour"))').run(crypto.randomUUID(), user.id);
  res.json({ ok: true, message: 'If the account exists, a reset request was recorded.' });
});

app.get('/api/users', (req, res) => {
  const q = `%${String(req.query.q || '').trim()}%`;
  res.json({ data: db.prepare('SELECT id, username, display_name, robux_balance, created_at FROM users WHERE username LIKE ? OR display_name LIKE ? LIMIT 50').all(q, q) });
});
app.get('/api/users/:id', (req, res) => {
  const user = db.prepare('SELECT u.id, u.username, u.display_name, u.robux_balance, u.created_at, p.about, p.status, p.avatar_url FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE u.id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});
app.put('/api/profile', requireUser, (req, res) => {
  db.prepare('UPDATE profiles SET about=?, status=? WHERE user_id=?').run(String(req.body.about || ''), String(req.body.status || ''), req.user.id);
  res.json({ ok: true });
});
app.get('/api/settings', requireUser, (req, res) => res.json(db.prepare('SELECT * FROM settings WHERE user_id=?').get(req.user.id)));
app.put('/api/settings', requireUser, (req, res) => {
  const current = db.prepare('SELECT * FROM settings WHERE user_id=?').get(req.user.id) || {};
  const next = { ...current, ...req.body };
  db.prepare('UPDATE settings SET language=?, theme=?, allow_messages_from=?, allow_trade_requests=?, email_notifications=?, two_factor_enabled=? WHERE user_id=?')
    .run(next.language, next.theme, next.allow_messages_from, Number(!!next.allow_trade_requests), Number(!!next.email_notifications), Number(!!next.two_factor_enabled), req.user.id);
  res.json({ ok: true });
});

app.get('/api/games', (req, res) => res.json({ data: db.prepare('SELECT g.*, u.display_name AS creator_name FROM games g LEFT JOIN users u ON u.id=g.creator_user_id ORDER BY playing DESC').all() }));
app.post('/api/games/:id/play', requireUser, (req, res) => {
  db.prepare('UPDATE games SET playing=playing+1, visits=visits+1 WHERE id=?').run(req.params.id);
  res.json({ ok: true, launchUrl: `/games/${req.params.id}/play` });
});
app.get('/api/catalog', (req, res) => res.json({ data: db.prepare('SELECT m.*, u.display_name AS creator_name FROM marketplace_items m LEFT JOIN users u ON u.id=m.creator_user_id ORDER BY m.created_at DESC').all() }));
app.post('/api/catalog/:id/buy', requireUser, (req, res) => {
  const item = db.prepare('SELECT * FROM marketplace_items WHERE id=?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (req.user.robux_balance < item.price_robux) return res.status(400).json({ error: 'Not enough Robux' });
  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET robux_balance=robux_balance-? WHERE id=?').run(item.price_robux, req.user.id);
    db.prepare('INSERT OR IGNORE INTO inventory (user_id, item_id) VALUES (?, ?)').run(req.user.id, item.id);
    db.prepare('INSERT INTO transactions (user_id, type, amount_robux, description, related_id) VALUES (?, "purchase", ?, ?, ?)').run(req.user.id, -item.price_robux, `Purchased ${item.name}`, item.id);
  }); tx();
  res.json({ ok: true });
});
app.get('/api/inventory', requireUser, (req, res) => res.json({ data: db.prepare('SELECT i.*, m.name, m.item_type, m.thumbnail_url, m.price_robux FROM inventory i JOIN marketplace_items m ON m.id=i.item_id WHERE i.user_id=?').all(req.user.id) }));
app.get('/api/friends', requireUser, (req, res) => res.json({ data: db.prepare(`SELECT f.*, u.id AS friend_id, u.username, u.display_name FROM friendships f JOIN users u ON u.id=CASE WHEN f.requester_id=? THEN f.addressee_id ELSE f.requester_id END WHERE (f.requester_id=? OR f.addressee_id=?) AND f.status='accepted'`).all(req.user.id, req.user.id, req.user.id) }));
app.post('/api/friends/request', requireUser, (req, res) => {
  const id = Number(req.body.userId || req.body.user_id);
  if (!id || id === req.user.id) return res.status(400).json({ error: 'Invalid user' });
  db.prepare('INSERT OR IGNORE INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, "pending")').run(req.user.id, id);
  res.json({ ok: true });
});
app.post('/api/friends/:id/accept', requireUser, (req, res) => { db.prepare('UPDATE friendships SET status="accepted", updated_at=CURRENT_TIMESTAMP WHERE id=? AND addressee_id=?').run(req.params.id, req.user.id); res.json({ ok: true }); });
app.get('/api/messages', requireUser, (req, res) => res.json({ data: db.prepare('SELECT m.*, s.username AS sender_name, r.username AS recipient_name FROM messages m JOIN users s ON s.id=m.sender_id JOIN users r ON r.id=m.recipient_id WHERE recipient_id=? OR sender_id=? ORDER BY created_at DESC').all(req.user.id, req.user.id) }));
app.post('/api/messages', requireUser, (req, res) => {
  const to = db.prepare('SELECT id FROM users WHERE lower(username)=lower(?) OR id=?').get(String(req.body.to || req.body.recipient || ''), Number(req.body.to || 0));
  if (!to) return res.status(404).json({ error: 'Recipient not found' });
  db.prepare('INSERT INTO messages (sender_id, recipient_id, subject, body) VALUES (?, ?, ?, ?)').run(req.user.id, to.id, String(req.body.subject || ''), String(req.body.body || req.body.message || ''));
  res.json({ ok: true });
});
app.get('/api/notifications', requireUser, (req, res) => res.json({ data: db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(req.user.id) }));
app.post('/api/notifications/:id/read', requireUser, (req, res) => { db.prepare('UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?').run(req.params.id, req.user.id); res.json({ ok: true }); });
app.get('/api/transactions', requireUser, (req, res) => res.json({ data: db.prepare('SELECT * FROM transactions WHERE user_id=? ORDER BY created_at DESC').all(req.user.id) }));
app.post('/api/robux/purchase', requireUser, (req, res) => {
  const amount = Math.max(0, Math.min(100000, Number(req.body.amount || 400)));
  db.prepare('UPDATE users SET robux_balance=robux_balance+? WHERE id=?').run(amount, req.user.id);
  db.prepare('INSERT INTO transactions (user_id, type, amount_robux, description) VALUES (?, "robux", ?, ?)').run(req.user.id, amount, `Purchased ${amount} Robux`);
  res.json({ ok: true, amount });
});
app.post('/api/giftcards/redeem', requireUser, (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  const card = db.prepare('SELECT * FROM gift_cards WHERE code=?').get(code);
  if (!card) return res.status(404).json({ error: 'Invalid code' });
  if (card.redeemed_at) return res.status(409).json({ error: 'Code already redeemed' });
  db.prepare('UPDATE gift_cards SET redeemed_by_user_id=?, redeemed_at=CURRENT_TIMESTAMP WHERE code=?').run(req.user.id, code);
  db.prepare('UPDATE users SET robux_balance=robux_balance+? WHERE id=?').run(card.amount_robux, req.user.id);
  db.prepare('INSERT INTO transactions (user_id, type, amount_robux, description) VALUES (?, "gift_card", ?, ?)').run(req.user.id, card.amount_robux, `Redeemed gift card ${code}`);
  res.json({ ok: true, amount: card.amount_robux });
});
app.get('/api/groups', (req, res) => res.json({ data: db.prepare('SELECT g.*, u.display_name AS owner_name FROM groups g LEFT JOIN users u ON u.id=g.owner_user_id').all() }));
app.post('/api/groups/:id/join', requireUser, (req, res) => { db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)').run(req.params.id, req.user.id); db.prepare('UPDATE groups SET member_count=(SELECT COUNT(*) FROM group_members WHERE group_id=?) WHERE id=?').run(req.params.id, req.params.id); res.json({ ok: true }); });
app.get('/api/trades', requireUser, (req, res) => res.json({ data: db.prepare('SELECT * FROM trades WHERE from_user_id=? OR to_user_id=? ORDER BY created_at DESC').all(req.user.id, req.user.id) }));
app.post('/api/trades', requireUser, (req, res) => { db.prepare('INSERT INTO trades (from_user_id, to_user_id, offered_item_id, requested_item_id, robux) VALUES (?, ?, ?, ?, ?)').run(req.user.id, Number(req.body.toUserId), req.body.offeredItemId || null, req.body.requestedItemId || null, Number(req.body.robux || 0)); res.json({ ok: true }); });
app.get('/api/search', (req, res) => {
  const q = `%${String(req.query.q || '').trim()}%`;
  res.json({ users: db.prepare('SELECT id, username, display_name FROM users WHERE username LIKE ? OR display_name LIKE ? LIMIT 10').all(q, q), games: db.prepare('SELECT id, title FROM games WHERE title LIKE ? LIMIT 10').all(q), items: db.prepare('SELECT id, name FROM marketplace_items WHERE name LIKE ? LIMIT 10').all(q) });
});

// Compatibility endpoints frequently requested by archived Roblox bundles.
app.get(['/v1/users/authenticated', '/users/v1/users/authenticated'], (req, res) => req.user ? res.json({ id: req.user.id, name: req.user.username, displayName: req.user.display_name }) : res.status(401).json({ errors: [{ message: 'Unauthorized' }] }));
app.get('/currency/balance', (req, res) => res.json({ robux: req.user ? req.user.robux_balance : 0 }));
app.get('/my/settings/json', (req, res) => res.json({ IsUserAuthenticated: !!req.user, UserId: req.user?.id || 0, Name: req.user?.username || null }));
app.get('/web/submit', (req, res) => res.redirect(req.query.url || '/'));
app.all('/api/local-compat', (req, res) => res.json({ ok: true, local: true }));
app.get('/external-link', (req, res) => res.redirect('/home'));
app.get('/offline-assets/resource', (req, res) => res.redirect('/offline-assets/img/placeholder.svg'));

app.get(/^\/(js|_next)\//, (req, res) => res.type('application/javascript').send('/* archived external script stub */'));
app.get(/\.(css)$/i, (req, res) => res.type('text/css').send('/* archived external stylesheet stub */'));
app.get(/\.(png|jpg|jpeg|gif|webp|ico)$/i, (req, res) => res.redirect('/offline-assets/img/placeholder.svg'));
app.get(/\.(svg)$/i, (req, res) => res.type('image/svg+xml').send('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#393b44"/><text x="60" y="66" text-anchor="middle" fill="#fff" font-family="Arial" font-size="18">Roblox</text></svg>'));

app.get('*', (req, res) => {
  const page = resolvePage(req.path);
  if (page) return res.type('html').send(htmlResponse(page, req));
  res.status(200).type('html').send(`<!doctype html><title>Archive Route</title><body style="font-family:Arial,sans-serif;margin:40px;background:#191b22;color:#f2f4f5"><h1>Archive Route</h1><p>The local route <code>${req.path}</code> is available in this offline rebuild.</p><p><a href="/home">Home</a> · <a href="/catalog">Marketplace</a> · <a href="/login">Log In</a></p><script src="/assets/archive-app.js" defer></script></body>`);
});

app.listen(PORT, () => console.log(`Archive website running on http://localhost:${PORT}`));
}

main().catch(err => { console.error(err); process.exit(1); });
