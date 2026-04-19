const express = require('express')
const cors = require('cors')
const path = require('path')
const http = require('http')
const { WebSocketServer } = require('ws')

const app = express()
app.use(cors())
app.use(express.json())

const PUBLIC = path.join(__dirname, 'public')
app.use(express.static(PUBLIC))

// Serve control.html as the default root route
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC, 'control.html'))
})

// Also serve the top-level assets folder so files placed there are available at /assets/
app.use('/assets', express.static(path.join(__dirname, 'assets')))

// In-memory state (will be seeded from DB if available)
const state = {
  rank: 'Aspirant',
  tier: 'Tier I',
  win: 0,
  learn: 0,
  rp: 0,
  // layout: 'vertical' or 'horizontal'
  layout: 'vertical'
}

// Persist state to SQLite using local helper
let db = null
try{
  db = require('./db')
  const row = db.getLatest()
  if(row){
    if(row.rank) state.rank = row.rank
    if(row.tier) state.tier = row.tier
    if(typeof row.win === 'number') state.win = row.win
    if(typeof row.learn === 'number') state.learn = row.learn
    if(typeof row.rp === 'number') state.rp = row.rp
  }
}catch(e){
  console.warn('SQLite not available:', e.message)
}

let clients = []

// We'll attach a WebSocket server to broadcast updates too (see bottom)
let wss = null

function sendToClients(data){
  const payload = `data: ${JSON.stringify(data)}\n\n`
  clients.forEach(res => res.write(payload))
  // broadcast to websocket clients if available
  if(wss){
    const msg = JSON.stringify(data)
    wss.clients.forEach(c => {
      try{ if(c.readyState === 1) c.send(msg) }catch(e){}
    })
  }
}

app.get('/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
  res.write(`data: ${JSON.stringify(state)}\n\n`)
  clients.push(res)
  req.on('close', () => {
    clients = clients.filter(c => c !== res)
  })
})

app.get('/api/state', (req, res) => res.json(state))

app.post('/api/state', (req, res) => {
  const body = req.body || {}
  if(body.rank) state.rank = body.rank
  if(body.tier) state.tier = body.tier
  if(typeof body.win === 'number') state.win = body.win
  if(typeof body.learn === 'number') state.learn = body.learn
  if(typeof body.rp === 'number') state.rp = body.rp
  if(body.layout) state.layout = body.layout
  // persist
  try{ if(db) db.upsert(state) }catch(e){}
  sendToClients(state)
  res.json(state)
})

app.post('/api/increment', (req, res) => {
  const { field, delta } = req.body || {}
  const d = typeof delta === 'number' ? delta : 1
  if(field === 'win') state.win = Math.max(0, state.win + d)
  if(field === 'learn') state.learn = Math.max(0, state.learn + d)
  // persist
  try{ if(db) db.upsert(state) }catch(e){}
  sendToClients(state)
  res.json(state)
})

// Dedicated endpoints to avoid ambiguity between fields
app.post('/api/win', (req, res) => {
  const { delta } = req.body || {}
  const d = Number(delta) || 0
  state.win = Math.max(0, state.win + d)
  try{ if(db) db.upsert(state) }catch(e){}
  sendToClients(state)
  res.json(state)
})

app.post('/api/learn', (req, res) => {
  const { delta } = req.body || {}
  const d = Number(delta) || 0
  state.learn = Math.max(0, state.learn + d)
  try{ if(db) db.upsert(state) }catch(e){}
  sendToClients(state)
  res.json(state)
})

app.post('/api/reset', (req, res) => {
  state.win = 0
  state.learn = 0
  try{ if(db) db.upsert(state) }catch(e){}
  sendToClients(state)
  res.json(state)
})

const PORT = process.env.PORT || 3000
// Create http server and attach a WebSocket server for live updates
const server = http.createServer(app)
wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', socket => {
  try{ socket.send(JSON.stringify(state)) }catch(e){}
  socket.on('close', ()=>{})
})

server.listen(PORT, () => console.log(`Server + WebSocket started on http://localhost:${PORT}`))
