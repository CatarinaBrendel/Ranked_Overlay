const db = require('../db')

console.log('Database path:', db.DB_PATH)
const row = db.getLatest()
if (row) {
  console.log('Existing badge row:', row)
} else {
  console.log('No badge row found yet. Inserting default row.')
  db.upsert({ rank: 'Aspirant', tier: 'Tier I', win: 0, learn: 0, rp: 0 })
  console.log('Inserted default row.')
}

console.log('Migration complete.')
