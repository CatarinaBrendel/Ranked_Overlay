(() => {
  const root = document.getElementById('root')
  let state = {rank:'Aspirant',tier:'Tier I',win:0,learn:0}

  function render(){
    root.innerHTML = ''
    // ensure base class and layout class
    root.className = 'badge'
    if(state.layout === 'horizontal') root.classList.add('horizontal')
    const img = document.createElement('img')
    img.className='badge-img'

    // Compose asset candidates based on Rank + Tier combination
    const tierMap = { 'Tier I': 1, 'Tier II': 2, 'Tier III': 3, 'Tier 1': 1, 'Tier 2': 2, 'Tier 3': 3 }

    // Map display rank names to asset base names when they differ (e.g. 'Challenge' -> 'Challenger')
    const rankAssetMap = {
      'Challenge': 'Challenger'
    }

    // Some ranks don't have tier-specific icons and should always use the base icon
    // Aspirant should display tiers, so do not include it here.
    const noTierRanks = new Set(['Grandmaster','Challenger','Challenge'])

    const assetBaseName = (rankAssetMap[state.rank] || state.rank)
    const rankClean = assetBaseName.replace(/\s+/g,'_')
    const tierNum = tierMap[state.tier]
    const candidates = []
    if(tierNum && !noTierRanks.has(state.rank)) candidates.push(`${rankClean}_tier_${tierNum}_icon.png`)
    candidates.push(`${rankClean}_icon.png`)

    // Fallback text element when no image exists
    const fallback = document.createElement('div')
    fallback.className = 'fallback-text'
    fallback.style.display = 'none'
    fallback.textContent = noTierRanks.has(state.rank) ? state.rank : `${state.rank} ${state.tier}`

    // Try loading candidates in order, show fallback if none found
    let tryIndex = 0
    function tryLoad(){
      if(tryIndex >= candidates.length){
        img.style.display = 'none'
        fallback.style.display = 'block'
        console.warn('No image found for candidates:', candidates)
        return
      }
      const url = `/assets/${candidates[tryIndex]}`
      console.debug('Trying asset:', url)
      img.style.display = ''
      fallback.style.display = 'none'
      img.src = url
      tryIndex++
    }
    img.onerror = tryLoad
    tryLoad()
    // top container groups image + text and adapts via CSS
    const top = document.createElement('div')
    top.className = 'badge-top'
    top.appendChild(img)
    top.appendChild(fallback)

    const txt = document.createElement('div')
    txt.className = 'text'
    const r = document.createElement('div')
    r.className='rank'
    r.textContent = state.rank
    txt.appendChild(r)
    if(!noTierRanks.has(state.rank)){
      const t = document.createElement('div')
      t.className='tier'
      t.textContent = state.tier
      txt.appendChild(t)
    } else {
      // For ranks without tiers (e.g., Grandmaster), show RP beneath the rank text
      const rpDivText = document.createElement('div')
      rpDivText.className = 'rp-display rp-inline'
      rpDivText.textContent = `RP: ${state.rp || 0}`
      txt.appendChild(rpDivText)
    }
    top.appendChild(txt)
    root.appendChild(top)

    const counters = document.createElement('div')
    counters.className='counters'
    counters.innerHTML = `<div>Win ${state.win}</div><div>Learn ${state.learn}</div>`
    // Place counters beneath the rank/tier text so they sit under the text column
    txt.appendChild(counters)
  }

  // WebSocket updates
  (function connectWS(){
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(proto + '//' + location.host + '/ws')
    ws.onmessage = e => { try{ state = JSON.parse(e.data); render() }catch(e){} }
    ws.onclose = () => setTimeout(connectWS, 1000)
  })()

  (async ()=>{ const res = await fetch('/api/state'); state = await res.json(); render() })()
})()
