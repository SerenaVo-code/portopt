import React, { useState } from 'react'
import Berth from './Berth.jsx'
import Assign from './Assign.jsx'
import Knap from './Knap.jsx'
import Bins from './Bins.jsx'
import Overview from './Overview.jsx'
import { Icon, I } from './shared.jsx'
import { sampleShips, SAMPLES } from './util.js'

const MODS = [
  ['overview', '0', 'Tổng quan'],
  ['berth', '1', 'Thuê bến'],
  ['assign', '2', 'Phân công đội', true],
  ['knap', '3', 'Quỹ giờ công', true],
  ['bins', '4', 'Xếp container', true],
]

export default function App() {
  const [mod, setMod] = useState(() => {
    const h = window.location.hash.replace('#', '')
    return MODS.some((m) => m[0] === h) ? h : 'berth'
  })
  const [berthShips, setBerthShips] = useState(() => sampleShips(SAMPLES[0]))
  const go = (k) => { setMod(k); try { window.history.replaceState(null, '', `#${k}`) } catch { /* ignore */ } }
  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <div className="logo" style={{ color: '#fff' }}><Icon d={I.anchor} size={20} /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <h1>Điều phối cảng cho hãng tàu</h1><small>Demo CS112 · Thiết kế và phân tích thuật toán</small>
          </div>
        </div>
        <nav className="mods" aria-label="Module">
          {MODS.map(([k, n, label, isNew]) => (
            <button key={k} className={`mod ${mod === k ? 'on' : ''}`} onClick={() => go(k)} data-testid={`mod-${k}`}>
              <span className="n">{n}</span>{label}{isNew && <span className="new">MỚI</span>}
            </button>
          ))}
        </nav>
      </header>
      {mod === 'overview' && <Overview go={go} />}
      {[['berth', <Berth key="b" onShips={setBerthShips} />], ['assign', <Assign key="a" berthShips={berthShips} />], ['knap', <Knap key="k" />], ['bins', <Bins key="n" />]].map(([k, el]) => (
        <div key={k} data-m={k} hidden={mod !== k} style={mod === k ? { display: 'contents' } : undefined}>{el}</div>
      ))}
    </div>
  )
}
