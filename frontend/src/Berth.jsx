import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { solve } from './api.js'
import StepView from './StepView.jsx'
import {
  ALGOS, SAMPLES, sampleShips, randomShips, parsePairs, hasPair, contractsOf,
  toHM, parseHM, fmtNum, colorOf, tintOf,
} from './util.js'

import { Icon, I, TimeInput } from './shared.jsx'

const KIND_LABEL = { info: 'GIỚI THIỆU', assign: 'GÁN', back: 'QUAY LUI', found: 'TỐT NHẤT HIỆN CÓ', dead: 'BỎ NHÁNH', done: 'HOÀN TẤT' }

export default function Berth({ onShips }) {
  const [ships, setShips] = useState(() => sampleShips(SAMPLES[0]))
  const [pairs, setPairs] = useState(SAMPLES[0].pairs)
  const [F, setF] = useState(SAMPLES[0].F)
  const [r, setR] = useState(SAMPLES[0].r)
  const [pairText, setPairText] = useState('')
  const [pairErr, setPairErr] = useState('')
  const [algo, setAlgo] = useState('greedy')
  const [tab, setTab] = useState('steps')
  const [data, setData] = useState(null)
  const [solved, setSolved] = useState(null) // đầu vào đã dùng để giải
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { onShips && onShips(ships) }, [ships]) // eslint-disable-line react-hooks/exhaustive-deps

  const input = useMemo(() => ({ ships, pairs, F: Number(F), r: Number(r) }), [ships, pairs, F, r])
  const stale = data && JSON.stringify(input) !== JSON.stringify(solved)

  const validation = useMemo(() => {
    if (!ships.length) return 'Cần ít nhất 1 tàu.'
    for (const s of ships) if (!(s.e > s.s)) return `${s.name}: giờ rời phải sau giờ đến.`
    if (!(F !== '' && Number(F) >= 0) || !(r !== '' && Number(r) >= 0)) return 'F và r phải là số không âm.'
    return ''
  }, [ships, F, r])

  const run = useCallback(async (inp) => {
    setLoading(true); setError(''); setPlaying(false)
    try {
      const d = await solve(inp)
      setData(d); setSolved(inp)
      setStep(d.results[algo].steps.length - 1)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [algo])

  useEffect(() => { run(input) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const res = data?.results[algo]
  const steps = res?.steps ?? []
  const cur = steps[Math.min(step, steps.length - 1)]
  const shownShips = solved?.ships ?? ships

  useEffect(() => {
    if (!playing) return
    if (step >= steps.length - 1) { setPlaying(false); return }
    const id = setTimeout(() => setStep((s) => s + 1), 650)
    return () => clearTimeout(id)
  }, [playing, step, steps.length])

  const pickAlgo = (k) => {
    setAlgo(k); setPlaying(false)
    if (data) setStep(data.results[k].steps.length - 1)
  }
  const updShip = (i, patch) => setShips((a) => a.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const rename = (a) => a.map((s, i) => ({ ...s, name: `Tàu ${i + 1}` }))
  const delShip = (i) => {
    setShips((a) => rename(a.filter((_, j) => j !== i)))
    setPairs((p) => p.filter(([x, y]) => x !== i && y !== i).map(([x, y]) => [x > i ? x - 1 : x, y > i ? y - 1 : y]))
  }
  const addShip = () => setShips((a) => rename([...a, { name: '', s: 8, e: 12 }]))
  const loadSample = (sm) => { setShips(sampleShips(sm)); setPairs(sm.pairs); setF(sm.F); setR(sm.r) }
  const addPairs = () => {
    const out = parsePairs(pairText, ships.length)
    if (out.error) { setPairErr(out.error); return }
    setPairErr('')
    setPairs((p) => { const n = [...p]; out.pairs.forEach(([a, b]) => { if (!hasPair(n, a, b)) n.push([a, b]) }); return n })
    setPairText('')
  }
  const reset = () => { setData(null); setSolved(null); setStep(0); setPlaying(false); setError(''); loadSample(SAMPLES[0]); run({ ships: sampleShips(SAMPLES[0]), pairs: SAMPLES[0].pairs, F: SAMPLES[0].F, r: SAMPLES[0].r }) }

  const col = cur?.col ?? []
  const contracts = useMemo(() => contractsOf(shownShips, col, solved?.F ?? 0, solved?.r ?? 0), [shownShips, col, solved])
  const total = contracts.reduce((t, c) => t + c.cost, 0)
  const assigned = col.filter((k) => k >= 0).length
  const idle = contracts.reduce((t, c) => t + (c.hours - c.busy), 0)

  return (
      <div className="layout">
        <aside>
          <section className="sec">
            <div className="sec-h">Bộ dữ liệu mẫu</div>
            <div className="ctl">
              {SAMPLES.map((sm) => <button key={sm.id} className="btn sm" onClick={() => loadSample(sm)}>{sm.label}</button>)}
            </div>
          </section>

          <section className="sec">
            <div className="sec-h">Thuật toán</div>
            {ALGOS.map((a) => (
              <button key={a.key} className={`algo ${algo === a.key ? 'on' : ''}`} onClick={() => pickAlgo(a.key)} data-testid={`algo-${a.key}`}>
                <span className="radio" /><span><b>{a.name}</b><span className="d">{a.desc}</span></span>
              </button>
            ))}
          </section>

          <section className="sec">
            <div className="sec-h">Tham số thuê bến</div>
            <div className="row2">
              <label className="field">Phí hợp đồng (F)
                <div className="inp"><span className="u">$</span><input id="inp-F" type="number" min="0" value={F} onChange={(e) => setF(e.target.value)} /></div>
              </label>
              <label className="field">Giá mỗi giờ (r)
                <div className="inp"><input id="inp-r" type="number" min="0" value={r} onChange={(e) => setR(e.target.value)} /><span className="u">/giờ</span></div>
              </label>
            </div>
            <p className="hint">Mỗi hợp đồng tính <b>F + r × số giờ thuê</b>, kể cả giờ trống giữa hai tàu.</p>
          </section>

          <section className="sec">
            <div className="sec-h">
              <span>Danh sách tàu · {ships.length}</span>
              <span className="ctl" style={{ gap: 6 }}>
                <button className="iconbtn" title="Tạo ngẫu nhiên 8 tàu" onClick={() => { setShips(randomShips(8)); setPairs([]) }}><Icon d={I.dice} size={15} /></button>
                <button className="iconbtn" title="Thêm tàu" onClick={addShip} data-testid="add-ship"><Icon d={I.plus} size={15} /></button>
              </span>
            </div>
            <div className="ships-h"><span>TÀU</span><span>THỜI GIAN</span><span>TRẠNG THÁI</span><span /></div>
            <div>
              {ships.map((s, i) => {
                const inSolved = solved && solved.ships.length === ships.length
                const k = inSolved && col[i] >= 0 ? col[i] : -1
                const isCur = inSolved && cur && cur.cur === i
                return (
                  <div key={i} className={`ship ${isCur ? 'cur' : ''} ${inSolved && k < 0 && !isCur ? 'wait' : ''}`}>
                    <span className="nm">{s.name}</span>
                    <span className="tm">
                      <TimeInput value={s.s} onCommit={(v) => updShip(i, { s: v })} />–
                      <TimeInput value={s.e} onCommit={(v) => updShip(i, { e: v })} />
                    </span>
                    <span className="st">
                      {isCur ? <span className="pill">ĐANG XÉT</span>
                        : k >= 0 ? <><span className="dot" style={{ background: colorOf(k) }} />HĐ{k + 1}</>
                          : <span style={{ color: 'var(--ink-faint)' }}>Chờ</span>}
                    </span>
                    <button className="xbtn" title="Xóa tàu" onClick={() => delShip(i)}>×</button>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="sec">
            <div className="sec-h"><span>Ràng buộc phụ</span></div>
            <p className="hint">Hai tàu không dùng chung hợp đồng dù không trùng giờ, ví dụ cần một tàu kéo hoặc hàng nguy hiểm không được neo cạnh nhau.</p>
            <div className="row2">
              <div className="inp" style={{ flex: 1, background: '#fff' }}>
                <input placeholder="VD: 2-5, 1-7" value={pairText} onChange={(e) => setPairText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPairs()} data-testid="pair-input" />
              </div>
              <button className="btn sm" onClick={addPairs}>Thêm</button>
            </div>
            {pairErr && <div className="err">{pairErr}</div>}
            <div className="chips">
              {pairs.map(([a, b], i) => (
                <span className="chip" key={i}>Tàu {a + 1} – Tàu {b + 1}
                  <button className="xbtn" onClick={() => setPairs((p) => p.filter((_, j) => j !== i))}>×</button></span>
              ))}
            </div>
          </section>

          <section className="sec" style={{ marginTop: 'auto' }}>
            {validation && <div className="err">{validation}</div>}
            <div className="row2">
              <button className="btn primary" disabled={loading || !!validation} onClick={() => run(input)} data-testid="run">
                {loading ? 'Đang chạy…' : data ? 'Chạy lại thuật toán' : 'Chạy thuật toán'}
              </button>
              <button className="btn" onClick={reset}>Đặt lại</button>
            </div>
            {error ? <div className="err">{error}</div>
              : stale ? <div className="status stale">Dữ liệu đã đổi, bấm chạy lại để cập nhật kết quả.</div>
                : data ? <div className="status"><Icon d={I.check} size={14} />Hoàn tất · {res.col.filter((k) => k >= 0).length}/{shownShips.length} tàu đã xếp bến</div> : null}
          </section>
        </aside>

        <main>
          <div className="bar">
            <div className="tabs" role="tablist">
              {[['steps', 'Từng bước'], ['timeline', 'Dòng thời gian'], ['graph', 'Đồ thị'], ['compare', 'So sánh']].map(([k, l]) => (
                <button key={k} role="tab" className={tab === k ? 'on' : ''} onClick={() => setTab(k)} data-testid={`tab-${k}`}>{l}</button>
              ))}
            </div>
            {tab !== 'compare' && steps.length > 0 && (
              <div className="ctl">
                <span className="lab" data-testid="step-label">Bước {Math.min(step, steps.length - 1)}/{steps.length - 1}{cur?.kind === 'done' ? ' · Hoàn tất' : ''}</span>
                <button className="iconbtn" aria-label="Về đầu" onClick={() => { setPlaying(false); setStep(0) }}><Icon d={I.first} size={14} /></button>
                <button className="iconbtn" aria-label="Bước trước" onClick={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)) }} data-testid="prev"><Icon d={I.prev} size={14} /></button>
                <button className="iconbtn fill" aria-label={playing ? 'Tạm dừng' : 'Phát'} onClick={() => { if (!playing && step >= steps.length - 1) setStep(0); setPlaying((p) => !p) }} data-testid="play"><Icon d={playing ? I.pause : I.play} size={14} /></button>
                <button className="iconbtn" aria-label="Bước tiếp" onClick={() => { setPlaying(false); setStep((s) => Math.min(steps.length - 1, s + 1)) }} data-testid="next"><Icon d={I.next} size={14} /></button>
                <button className="iconbtn" aria-label="Về cuối" onClick={() => { setPlaying(false); setStep(steps.length - 1) }}><Icon d={I.last} size={14} /></button>
                {algo === 'bt' && <button type="button" className="btn sm" style={{ height: 30 }} onClick={() => { setPlaying(false); const j = steps.findIndex((s, i) => i > step && (s.kind === 'found' || s.kind === 'dead' || s.kind === 'done')); setStep(j < 0 ? steps.length - 1 : j) }}>Nhảy tới sự kiện kế</button>}
                <input type="range" min="0" max={steps.length - 1} value={Math.min(step, steps.length - 1)} onChange={(e) => { setPlaying(false); setStep(Number(e.target.value)) }} />
              </div>
            )}
          </div>

          {!data && !error && <div className="empty">Đang giải bài toán…</div>}
          {data && tab === 'steps' && cur && <StepView algo={algo} steps={steps} step={step} setStep={(i) => { setPlaying(false); setStep(i) }} ships={shownShips} F={solved.F} r={solved.r} lbCost={data.lbCost} />}
          {data && tab === 'timeline' && <Timeline ships={shownShips} contracts={contracts} cur={cur} />}
          {data && tab === 'graph' && <GraphView ships={shownShips} pairs={solved.pairs} col={col} cur={cur} />}
          {data && tab === 'compare' && <Compare data={data} algo={algo} onPick={(k) => { pickAlgo(k); setTab('timeline') }} />}

          {data && tab !== 'compare' && tab !== 'steps' && cur && (
            <div className="stepbox" data-testid="stepbox">
              <span className={`badge ${cur.kind}`}>{KIND_LABEL[cur.kind]}</span>
              <p>{cur.msg}</p>
            </div>
          )}

          {data && tab !== 'compare' && tab !== 'steps' && (
            <div className="kpis">
              <div className="kpi"><span>Tổng chi phí</span><span className="v" data-testid="kpi-cost">{fmtNum(total)}<small>USD</small></span></div>
              <div className="kpi"><span>Số hợp đồng (bến)</span><span className="v">{contracts.length}</span></div>
              <div className="kpi"><span>Đã xếp bến</span><span className="v">{assigned}<small>/{shownShips.length} tàu</small></span></div>
              <div className="kpi"><span>Giờ trống phải trả</span><span className="v">{fmtNum(idle)}<small>giờ</small></span></div>
            </div>
          )}
        </main>
      </div>
  )
}

function niceTicks(lo, hi) {
  const span = hi - lo
  const stepH = [1, 2, 3, 4, 6, 12].find((s) => span / s <= 12) ?? 24
  const out = []
  for (let t = Math.ceil(lo / stepH) * stepH; t <= hi + 1e-9; t += stepH) out.push(t)
  return out
}

function Timeline({ ships, contracts, cur }) {
  const lo = Math.floor(Math.min(...ships.map((s) => s.s)))
  const hi = Math.ceil(Math.max(...ships.map((s) => s.e)))
  const pct = (t) => ((t - lo) / (hi - lo)) * 100
  const ticks = niceTicks(lo, hi)
  const curShip = cur && cur.cur >= 0 ? cur.cur : -1
  const curRow = cur ? cur.row : -1
  const rows = [...contracts]
  if (curRow >= 0 && !rows.some((c) => c.k === curRow)) rows.push({ k: curRow, ids: [], s: 0, e: 0, hours: 0, cost: 0, busy: 0, empty: true })
  rows.sort((a, b) => a.k - b.k)
  return (
    <div className="tl" data-testid="timeline">
      <div className="note"><span className="dashbox" />
        <span>Vùng viền nét đứt là khoảng thời gian phải trả tiền cho một hợp đồng, từ tàu đầu cập đến tàu cuối rời, <b>kể cả giờ trống ở giữa</b>.</span></div>
      <div className="tl-axis"><span /><div className="axis">{ticks.map((t) => <span className="tick" key={t} style={{ left: `${pct(t)}%` }}>{toHM(t)}</span>)}</div><span /></div>
      {rows.length === 0 && <div className="empty">Chưa có hợp đồng nào. Bấm “Bước tiếp” để xem thuật toán gán từng tàu.</div>}
      {rows.map((c) => {
        const ghost = curShip >= 0 && curRow === c.k && !c.ids.includes(curShip)
        return (
          <div key={c.k} className={`tl-row ${curRow === c.k ? 'cur' : ''}`}>
            <div className="tl-name"><b><span className="dot" style={{ background: colorOf(c.k), width: 9, height: 9 }} />HĐ{c.k + 1}</b>
              <small>{c.empty ? 'chưa có tàu' : `${fmtNum(c.hours)} giờ thuê`}</small></div>
            <div className="track">
              {ticks.map((t) => <span key={t} className="grid-l" style={{ left: `${pct(t)}%` }} />)}
              {!c.empty && <span className="win" style={{ left: `${pct(c.s)}%`, width: `${pct(c.e) - pct(c.s)}%`, background: tintOf(c.k), borderColor: colorOf(c.k) }} />}
              {c.ids.map((i) => (
                <span key={i} className={`blk ${i === curShip ? 'now' : ''}`} style={{ left: `${pct(ships[i].s)}%`, width: `${pct(ships[i].e) - pct(ships[i].s)}%`, background: colorOf(c.k) }}
                  title={`${ships[i].name} ${toHM(ships[i].s)}–${toHM(ships[i].e)}`}>{i + 1}</span>
              ))}
              {ghost && <span className="blk ghost" style={{ left: `${pct(ships[curShip].s)}%`, width: `${pct(ships[curShip].e) - pct(ships[curShip].s)}%` }}>{curShip + 1}</span>}
            </div>
            <div className="cost"><b>{c.empty ? '–' : fmtNum(c.cost)}</b><small>USD</small></div>
          </div>
        )
      })}
    </div>
  )
}

function GraphView({ ships, pairs, col, cur }) {
  const n = ships.length
  const W = 960, H = 440, cx = W / 2, cy = H / 2
  const rad = n <= 10 ? 30 : Math.max(9, Math.min(30, 700 / n))
  const rx = W / 2 - rad - 50, ry = H / 2 - rad - 34
  const pos = ships.map((_, i) => { const a = (2 * Math.PI * i) / n - Math.PI / 2; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] })
  const edges = []
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const time = ships[i].s < ships[j].e && ships[j].s < ships[i].e
    const extra = hasPair(pairs, i, j)
    if (time || extra) edges.push({ i, j, extra: extra && !time })
  }
  const c = cur ? cur.cur : -1
  const showLabels = n <= 12
  return (
    <>
      <div className="legend">
        <span><svg width="26" height="8"><line x1="1" y1="4" x2="25" y2="4" stroke="#9AA7B2" strokeWidth="2" strokeLinecap="round" /></svg>Trùng thời gian cập bến</span>
        <span><svg width="26" height="8"><line x1="1" y1="4" x2="25" y2="4" stroke="#9C4221" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" /></svg>Ràng buộc phụ</span>
        <span><svg width="26" height="8"><line x1="1" y1="4" x2="25" y2="4" stroke="#024D71" strokeWidth="3" strokeLinecap="round" /></svg>Cạnh của tàu đang xét</span>
        <span><span className="dot" style={{ background: 'var(--pending)', width: 12, height: 12 }} />Chưa xếp</span>
      </div>
      <div className="graph" data-testid="graph">
        <svg viewBox={`0 0 ${W} ${H}`}>
          {edges.map(({ i, j, extra }) => {
            const hot = c === i || c === j
            return <line key={`${i}-${j}`} x1={pos[i][0]} y1={pos[i][1]} x2={pos[j][0]} y2={pos[j][1]}
              stroke={hot ? '#024D71' : extra ? '#9C4221' : '#9AA7B2'} strokeWidth={hot ? 3 : 2} strokeLinecap="round"
              strokeDasharray={extra ? '7 6' : undefined} opacity={hot || c < 0 ? 1 : 0.6} />
          })}
          {ships.map((s, i) => {
            const k = col[i]; const [x, y] = pos[i]
            const now = i === c
            return (
              <g key={i}>
                {now && <circle cx={x} cy={y} r={rad + 7} fill="none" stroke="#024D71" strokeWidth="2" strokeDasharray="4 3" />}
                <circle cx={x} cy={y} r={rad} fill={k >= 0 ? colorOf(k) : now ? '#fff' : '#C3CBD6'} stroke={now ? '#024D71' : 'none'} strokeWidth="3" />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={Math.max(10, rad * 0.65)} fontWeight="700"
                  fill={k >= 0 ? '#fff' : now ? '#024D71' : '#5C6B78'}>{i + 1}</text>
                {showLabels && <text x={x} y={y + rad + 16} textAnchor="middle" fontSize="11" fill="#5C6B78" fontFamily="JetBrains Mono, monospace">{toHM(s.s)}–{toHM(s.e)}</text>}
              </g>
            )
          })}
        </svg>
      </div>
    </>
  )
}

function Compare({ data, algo, onPick }) {
  const rows = ALGOS.map((a) => ({ ...a, ...data.results[a.key] }))
  const min = Math.min(...rows.map((x) => x.cost))
  return (
    <>
      <div className="cmpwrap">
        <table className="cmp" data-testid="compare">
          <thead><tr><th>Thuật toán</th><th>Số HĐ</th><th>Tổng chi phí</th><th>So với cận dưới</th><th>Số bước</th><th>Thời gian</th></tr></thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.key} className={`${algo === x.key ? 'sel' : ''} ${x.cost === min ? 'win' : ''}`} onClick={() => onPick(x.key)}>
                <td>{x.name}{x.key === 'bt' && <span className={`tag ${x.exhausted ? 'ok' : 'no'}`}>{x.exhausted ? 'TỐI ƯU' : 'CHƯA CHẮC TỐI ƯU'}</span>}</td>
                <td>{x.nBerths}</td>
                <td>{fmtNum(x.cost)}</td>
                <td>{x.cost <= data.lbCost + 1e-9 ? '= cận dưới' : `+${fmtNum(x.cost - data.lbCost)}`}</td>
                <td>{x.steps.length - 1}</td>
                <td>{x.ms < 1 ? '<1' : fmtNum(x.ms)} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="note">
        <span>Cận dưới = {data.lb} hợp đồng × F + r × tổng giờ cập bến = <b>{fmtNum(data.lbCost)}</b>. Chi phí không thể thấp hơn mức này. Bấm một dòng để xem thuật toán đó chạy từng bước.</span>
      </div>
    </>
  )
}
