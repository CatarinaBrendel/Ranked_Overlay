const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

const DATA_DIR = path.join(__dirname, 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const DB_PATH = path.join(DATA_DIR, 'badges.db')
const db = new Database(DB_PATH)

// Create table if missing
db.exec(`
  CREATE TABLE IF NOT EXISTS badge (
    id INTEGER PRIMARY KEY,
    updated TEXT,
    rank TEXT,
    tier TEXT,
    win INTEGER DEFAULT 0,
    learn INTEGER DEFAULT 0,
    rp INTEGER DEFAULT 0,
    showCounters INTEGER DEFAULT 1
  )
`)

// Ensure column exists for older DBs
const cols = db.prepare("PRAGMA table_info(badge)").all().map(c => c.name)
if(!cols.includes('showCounters')){
  try{ db.exec("ALTER TABLE badge ADD COLUMN showCounters INTEGER DEFAULT 1") }catch(e){}
}

const getLatest = () => {
  const row = db.prepare('SELECT * FROM badge ORDER BY id DESC LIMIT 1').get()
  return row || null
}

// Upsert using fixed id=1 when no id provided (single-row storage)
const upsert = (obj) => {
  const timestamp = new Date().toISOString()
  const data = {
    updated: obj.updated || timestamp,
    rank: obj.rank || null,
    tier: obj.tier || null,
    win: typeof obj.win === 'number' ? obj.win : 0,
    learn: typeof obj.learn === 'number' ? obj.learn : 0,
    rp: typeof obj.rp === 'number' ? obj.rp : 0,
    showCounters: typeof obj.showCounters === 'boolean' ? (obj.showCounters ? 1 : 0) : 1
  }
  const stmt = db.prepare(`INSERT INTO badge (id, updated, rank, tier, win, learn, rp, showCounters)
    VALUES (1, @updated, @rank, @tier, @win, @learn, @rp, @showCounters)
    ON CONFLICT(id) DO UPDATE SET
      updated=excluded.updated,
      rank=excluded.rank,
      tier=excluded.tier,
      win=excluded.win,
      learn=excluded.learn,
      rp=excluded.rp,
      showCounters=excluded.showCounters
  `)
  stmt.run(data)
  return getLatest()
}

module.exports = { getLatest, upsert, DB_PATH }
