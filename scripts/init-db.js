const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { openDatabase } = require('../db/sqljs');

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '..', 'data', 'site.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });


function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return `pbkdf2$120000$${salt}$${hash}`;
}

async function main() {
const db = await openDatabase(dbPath);
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));

const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
if (count === 0) {
  const insertUser = db.prepare(`INSERT INTO users (username, display_name, email, password_hash, birthdate, robux_balance, email_verified_at)
    VALUES (@username, @display_name, @email, @password_hash, @birthdate, @robux_balance, CURRENT_TIMESTAMP)`);
  const profile = db.prepare('INSERT INTO profiles (user_id, about, status, avatar_url) VALUES (?, ?, ?, ?)');
  const settings = db.prepare('INSERT INTO settings (user_id) VALUES (?)');
  const users = [
    { username: 'awoken', display_name: 'awoken', email: 'awoken@example.com', birthdate: '2006-05-31', robux_balance: 1250, about: 'Welcome to my profile.', status: 'Exploring experiences' },
    { username: 'uncannym', display_name: 'uncannym', email: 'uncannym@example.com', birthdate: '2004-01-15', robux_balance: 830, about: 'Builder and group owner.', status: 'Creating' },
    { username: 'boblox', display_name: 'BOBLOX', email: 'boblox@example.com', birthdate: '2008-06-01', robux_balance: 400, about: 'Static archive demo account.', status: 'Online' }
  ];
  for (const u of users) {
    const info = insertUser.run({ ...u, password_hash: hashPassword('password123') });
    profile.run(info.lastInsertRowid, u.about, u.status, 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-5797DF27D2563DE33541472D0B0404EA-Png/150/150/AvatarHeadshot/Webp/noFilter');
    settings.run(info.lastInsertRowid);
  }

  const game = db.prepare('INSERT INTO games (title, creator_user_id, description, thumbnail_url, genre, visits, playing, max_players) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  [
    ['Adopt Me!', 1, 'Raise pets, decorate your home, and roleplay with friends.', 'https://tr.rbxcdn.com/180DAY-e555fb843451a557b102b3381d72240a/768/432/Image/Webp/noFilter', 'Roleplay', 38900000000, 128000, 48],
    ['Brookhaven RP', 2, 'Hang out, own houses, and roleplay in a city.', 'https://tr.rbxcdn.com/180DAY-7b578c170c863043cb3784fb2823b5ab/768/432/Image/Webp/noFilter', 'Town and City', 61500000000, 221000, 18],
    ['Tower of Hell', 1, 'Reach the top of randomly generated obbies.', 'https://tr.rbxcdn.com/180DAY-c051527841b8e1d65848e63255b5b82a/768/432/Image/Webp/noFilter', 'Obby', 24400000000, 44000, 20],
    ['Blox Fruits', 2, 'Train to become the strongest swordsman or fruit user.', 'https://tr.rbxcdn.com/180DAY-0facfdf03384959da3e890bd9a51ad1f/768/432/Image/Webp/noFilter', 'Adventure', 52000000000, 417000, 12]
  ].forEach(x => game.run(...x));

  const item = db.prepare('INSERT INTO marketplace_items (name, item_type, description, price_robux, creator_user_id, thumbnail_url, is_limited) VALUES (?, ?, ?, ?, ?, ?, ?)');
  [
    ['Classic ROBLOX Fedora', 'Hat', 'A timeless fedora for classic avatars.', 900, 1, 'https://tr.rbxcdn.com/30DAY-Avatar-0E90E9B4F26301873753FB3598865989-Png/352/352/Avatar/Webp/noFilter', 1],
    ['BOBLOX Shirt', 'Shirt', 'Archive-themed shirt.', 15, 2, 'https://tr.rbxcdn.com/30DAY-Avatar-5797DF27D2563DE33541472D0B0404EA-Png/352/352/Avatar/Webp/noFilter', 0],
    ['Builder Cap', 'Hat', 'For creators and builders.', 50, 2, 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-5797DF27D2563DE33541472D0B0404EA-Png/150/150/AvatarHeadshot/Webp/noFilter', 0],
    ['Dark Hoodie', 'Shirt', 'A dark-theme hoodie.', 25, 1, 'https://tr.rbxcdn.com/30DAY-Avatar-0E90E9B4F26301873753FB3598865989-Png/352/352/Avatar/Webp/noFilter', 0]
  ].forEach(x => item.run(...x));

  db.prepare('INSERT INTO inventory (user_id, item_id) VALUES (?, ?)').run(1, 1);
  db.prepare('INSERT INTO inventory (user_id, item_id) VALUES (?, ?)').run(1, 2);
  db.prepare('INSERT INTO inventory (user_id, item_id) VALUES (?, ?)').run(2, 3);
  db.prepare('INSERT INTO friendships (requester_id, addressee_id, status) VALUES (1, 2, "accepted")').run();
  db.prepare('INSERT INTO messages (sender_id, recipient_id, subject, body) VALUES (2, 1, "Welcome", "Thanks for checking out the rebuilt archive site.")').run();
  db.prepare('INSERT INTO notifications (user_id, type, title, body, link_url) VALUES (1, "system", "Welcome back", "Your offline archive now has live data.", "/home")').run();
  db.prepare('INSERT INTO groups (name, owner_user_id, description, emblem_url, member_count) VALUES (?, ?, ?, ?, ?)').run('uncannym enterprises', 2, 'A seed group reconstructed from the archived pages.', 'https://tr.rbxcdn.com/30DAY-GroupIcon-6d75fd7f6b8d7d64e3496750314c27b1/150/150/Image/Webp/noFilter', 2);
  db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (1, 2, "Owner")').run();
  db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (1, 1, "Member")').run();
  db.prepare('INSERT INTO gift_cards (code, amount_robux) VALUES (?, ?)').run('BOBLOX-2026-DEMO', 1000);
}

console.log(`Database ready at ${dbPath}`);

}

if (require.main === module) main().catch(err => { console.error(err); process.exit(1); });
module.exports = main;
