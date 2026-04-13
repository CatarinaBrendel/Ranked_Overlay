(() => {
  const ranks = ['Aspirant','Iron','Bronze','Silver','Gold','Platinum','Emerald','Diamond','Master','Grandmaster','Challenge']
  const tiers = ['Tier I','Tier II','Tier III']
  const noTierRanks = new Set(['Grandmaster','Challenger','Challenge'])

  console.debug('control.js loaded')
  const ranksEl = document.getElementById('ranks')
  const tiersEl = document.getElementById('tiers')
  const winEl = document.getElementById('win')
  const learnEl = document.getElementById('learn')
  const rpCard = document.getElementById('rp-card')
  const rpArea = document.getElementById('rp-area')

  if(!ranksEl || !tiersEl){
    console.error('Missing required DOM elements: ranks or tiers', {ranksEl, tiersEl})
    return
  }

  let state = {rank: ranks[0], tier: tiers[0], win:0, learn:0, rp:0}

  function renderList(container, items, key){
    container.innerHTML = ''
    // If rendering tiers but the selected rank has no tiers, show disabled notice
    if(container === tiersEl && noTierRanks.has(state.rank)){
      const note = document.createElement('div')
      note.className = 'muted'
      note.textContent = 'No tiers available for this rank'
      container.appendChild(note)
      return
    }
    items.forEach(it => {
      const b = document.createElement('button')
      b.textContent = it
      if(state[key] === it) b.classList.add('selected')
      b.addEventListener('click', ()=>{
        state[key] = it
        sendState()
        renderAll()
      })
      container.appendChild(b)
    })
  }

  function renderAll(){
    renderList(ranksEl, ranks, 'rank')
    renderList(tiersEl, tiers, 'tier')
    winEl.textContent = state.win
    learnEl.textContent = state.learn

    // Show/hide RP controls for ranks without tiers
    if(noTierRanks.has(state.rank)){
      rpCard.style.display = ''
      renderRp()
    }else{
      rpCard.style.display = 'none'
    }
  }

  function renderRp(){
    if(!rpArea) return
    rpArea.innerHTML = ''
    const value = document.createElement('div')
    value.className = 'rp-value'
    value.textContent = `RP: ${state.rp || 0}`

    const controls = document.createElement('div')
    controls.className = 'rp-controls'
    const dec = document.createElement('button')
    dec.type = 'button'
    dec.setAttribute('aria-label','Decrease RP')
    dec.className = 'btn primary light small'
    dec.textContent = '− 1'
    dec.addEventListener('click', async ()=>{
      const current = Math.max(0, Number(input.value) || 0)
      const newRp = Math.max(0, current - 1)
      input.value = newRp
      await setRp(newRp)
    })
    const inc = document.createElement('button')
    inc.type = 'button'
    inc.setAttribute('aria-label','Increase RP')
    inc.className = 'btn primary light small'
    inc.textContent = '+ 1'
    inc.addEventListener('click', async ()=>{
      const current = Math.max(0, Number(input.value) || 0)
      const newRp = current + 1
      input.value = newRp
      await setRp(newRp)
    })

    const input = document.createElement('input')
    input.type = 'number'
    input.min = '0'
    input.value = state.rp || 0
    input.className = 'rp-input'
    const setBtn = document.createElement('button')
    setBtn.type = 'button'
    setBtn.className = 'btn primary light'
    setBtn.textContent = 'Set'
    setBtn.addEventListener('click', async ()=>{
      const val = Math.max(0, Number(input.value) || 0)
      await setRp(val)
    })

    controls.appendChild(dec)
    controls.appendChild(inc)
    controls.appendChild(input)
    controls.appendChild(setBtn)

    rpArea.appendChild(value)
    rpArea.appendChild(controls)
  }

  async function setRp(val){
    // send via /api/state to update rp
    const res = await fetch('/api/state',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({rp: val})})
    if(res.ok){ const s = await res.json(); state = s; renderAll() }
  }

  async function sendState(){
    await fetch('/api/state',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(state)})
  }

  // Generic handler that reads delta from data attribute
  function wireCounter(id, field){
    const el = document.getElementById(id)
      if(!el) return
      if(typeof el.addEventListener !== 'function'){
        console.error('Element does not support addEventListener', id, el)
        return
      }
      el.addEventListener('click', async (ev)=>{
      const delta = parseInt(ev.currentTarget.dataset.delta || '0', 10)
      if(isNaN(delta) || delta === 0) return

      // optimistic update
      if(field === 'win') state.win = Math.max(0, (state.win || 0) + delta)
      if(field === 'learn') state.learn = Math.max(0, (state.learn || 0) + delta)
      renderAll()

      const body = { delta }
      console.debug(id + ' clicked, sending', field, body)
      const url = field === 'win' ? '/api/win' : '/api/learn'
      const resp = await fetch(url, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) })
      if(!resp.ok){
        const text = await resp.text()
        console.error('Server returned error', resp.status, text)
        return
      }
      const serverState = await resp.json()
      console.debug('server response', serverState)
      // use authoritative server state to avoid optimistic mismatch
      state = serverState
      renderAll()
    })
  }

  wireCounter('inc-win','win')
  wireCounter('dec-win','win')
  wireCounter('inc-learn','learn')
  wireCounter('dec-learn','learn')

  const resetBtn = document.getElementById('reset')
  if(resetBtn){
    if(typeof resetBtn.addEventListener === 'function'){
      resetBtn.addEventListener('click', async ()=>{
        await fetch('/api/reset',{method:'POST'})
      })
    } else {
      console.error('Reset element cannot listen for clicks', resetBtn)
    }
  }

  // Listen to updates via WebSocket
  (function connectWS(){
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(proto + '//' + location.host + '/ws')
    ws.onmessage = e => { try{ state = JSON.parse(e.data); renderAll() }catch(e){} }
    ws.onclose = () => setTimeout(connectWS, 1000)
  })();

  // initial render
  (async ()=>{
    const res = await fetch('/api/state')
    state = await res.json()
    renderAll()
  })();
})();
