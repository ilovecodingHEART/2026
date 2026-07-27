const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

let SQL;
async function openDatabase(filePath) {
  if (!SQL) SQL = await initSqlJs();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const raw = fs.existsSync(filePath) ? new SQL.Database(fs.readFileSync(filePath)) : new SQL.Database();
  return new SqlJsDatabase(raw, filePath);
}

class SqlJsDatabase {
  constructor(raw, filePath) { this.raw = raw; this.filePath = filePath; }
  pragma(sql) { try { this.raw.exec('PRAGMA ' + sql); } catch {} }
  exec(sql) { const out = this.raw.exec(sql); this.save(); return out; }
  prepare(sql) { return new Statement(this, sql); }
  transaction(fn) {
    return (...args) => {
      this.raw.exec('BEGIN TRANSACTION');
      try { const result = fn(...args); this.raw.exec('COMMIT'); this.save(); return result; }
      catch (e) { try { this.raw.exec('ROLLBACK'); } catch {} throw e; }
    };
  }
  save() { fs.writeFileSync(this.filePath, Buffer.from(this.raw.export())); }
}

class Statement {
  constructor(db, sql) { this.db = db; this.sql = sql; }
  _bind(stmt, args) {
    if (args.length === 1 && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
      const input = args[0];
      const params = {};
      for (const [key, value] of Object.entries(input)) {
        params[key] = value;
        params['@' + key.replace(/^[@:$]/, '')] = value;
        params[':' + key.replace(/^[@:$]/, '')] = value;
        params['$' + key.replace(/^[@:$]/, '')] = value;
      }
      stmt.bind(params);
    } else if (args.length) stmt.bind(args);
  }
  run(...args) {
    const stmt = this.db.raw.prepare(this.sql);
    this._bind(stmt, args);
    while (stmt.step()) {}
    stmt.free();
    const id = this.db.raw.exec('SELECT last_insert_rowid() AS id')[0]?.values?.[0]?.[0] || 0;
    this.db.save();
    return { lastInsertRowid: id, changes: 0 };
  }
  get(...args) {
    const stmt = this.db.raw.prepare(this.sql);
    this._bind(stmt, args);
    const row = stmt.step() ? normalize(stmt.getAsObject()) : undefined;
    stmt.free();
    return row;
  }
  all(...args) {
    const stmt = this.db.raw.prepare(this.sql);
    this._bind(stmt, args);
    const rows = [];
    while (stmt.step()) rows.push(normalize(stmt.getAsObject()));
    stmt.free();
    return rows;
  }
}
function normalize(row) {
  for (const k of Object.keys(row)) if (row[k] === 0 || row[k] === 1) row[k] = row[k];
  return row;
}

module.exports = { openDatabase };
