import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { solveAssign } from './api.js'
import { Controls, usePlayer, Code, VarsCard, Band, Trace, BoundChart, Verdict, CompareTable, TimeInput } from './shared.jsx'
import { fmtNum, toHM } from './util.js'

const B = 'Bốc dỡ', L = 'Lạnh'
const SKILLS = [B, L]
const SHIP_COLORS = ['#024D71', '#BD0F72', '#2C7A7B', '#9C4221', '#6B46C1', '#2F855A', '#B7791F', '#4A5568']
const shipColor = (i) => SHIP_COLORS[i % SHIP_COLORS.length]

const DEFAULT_SHIPS = [[6, 10, [B]], [8, 14, [B, L]], [11, 15, [B]], [13, 18, [B]], [15, 19, [B, L]], [16, 22, [B]]]
  .map(([s, e, need], i) => ({ name: `T${i + 1}`, s, e, need }))
const DEFAULT_TEAMS = [['Đội 1', [B], 100], ['Đội 2', [B], 90], ['Đội 3', [B, L], 130], ['Đội 4', [B], 160]]
  .map(([name, skills, rate]) => ({ name, skills, rate }))

const ALGOS = [
  { key: 'greedy', name: 'Tham lam theo giờ đến', desc: 'Tàu đến trước xếp trước, chọn đội rẻ nhất còn rảnh.' },
  { key: 'hard', name: 'Tham lam tàu khó trước', desc: 'Tàu có ít đội phù hợp nhất được xếp trước.' },
  { key: 'bt', name: 'Quay lui + nhánh cận', desc: 'Thử mọi cách gán, bỏ nhánh khi chi phí đã không thể tốt hơn phương án tốt nhất hiện có.' },
]

const GREEDY = (first) => [
  [0, first], [0, 'với mỗi tàu i theo thứ tự:'], [1, 'ứng viên ← đội đủ kỹ năng, rảnh trong [đến, rời]'],
  [1, 'nếu ứng viên rỗng: không gán được tàu i'], [1, 'chọn đội j có đơn giá[j] × giờ[i] nhỏ nhất'], [1, 'gán i → j, cập nhật lịch của đội j'],
]
const PSEUDO = {
  greedy: GREEDY('sắp các tàu theo giờ đến'),
  hard: GREEDY('sắp tàu theo số đội phù hợp tăng dần (khó trước)'),
  bt: [
    [0, 'rec(p, chiPhí):'], [1, 'nếu p = n: ghi lại phương án tốt nhất; return'], [1, 'i ← tàu thứ p theo giờ đến'],
    [1, 'với mỗi đội j đủ kỹ năng và rảnh, rẻ trước:'], [2, 'nếu cận(i, j) ≥ tốt nhất: bỏ nhánh'],
    [2, 'gán i → j; rec(p+1, chiPhí + c[i][j])'], [2, 'bỏ gán i  ← quay lui (lùi lại)'],
  ],
}
function lineSets(algo, line) {
  const cur = new Set(), ran = new Set()
  if (!line) return { cur, ran }
  cur.add(line)
  if (algo !== 'bt') { if (line === 5) [2, 3, 4].forEach((x) => ran.add(x)); if (line === 4) [2, 3].forEach((x) => ran.add(x)) }
  else { if (line === 6) [4, 5].forEach((x) => ran.add(x)); if (line === 7) [4, 5, 6].forEach((x) => ran.add(x)) }
  return { cur, ran }
}

export default function Assign({ berthShips }) {
  const [ships, setShips] = useState(DEFAULT_SHIPS)
  const [teams, setTeams] = useState(DEFAULT_TEAMS)
  const [algo, setAlgo] = useState('greedy')
  const [tab, setTab] = useState('steps')
  const [data, setData] = useState(null)
  const [solved, setSolved] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const input = useMemo(() => ({ ships, teams, pairs: [] }), [ships, teams])
  const stale = data && JSON.stringify(input) !== JSON.stringify(solved)
  const validation = useMemo(() => {
    if (!ships.length) return 'Cần ít nhất 1 tàu.'
    if (!teams.length) return 'Cần ít nhất 1 đội.'
    for (const s of ships) if (!(s.e > s.s)) return `${s.name}: giờ rời phải sau giờ đến.`
    for (const t of teams) if (!(Number(t.rate) >= 0)) return `${t.name}: đơn giá phải không âm.`
    return ''
  }, [ships, teams])

  const run = useCallback(async (inp) => {
    setLoading(true); setError('')
    try { const d = await solveAssign({ ...inp, teams: inp.teams.map((t) => ({ ...t, rate: Number(t.rate) })) }); setData(d); setSolved(inp) } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [])
  useEffect(() => { run(input) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const res = data?.results[algo]
  const steps = res?.steps ?? []
  const p = usePlayer(steps)
  useEffect(() => { p.jumpEnd() }, [data, algo]) // eslint-disable-line react-hooks/exhaustive-deps
  const cur = steps[p.step]
  const sh = solved?.ships ?? ships
  const tm = solved?.teams ?? teams

  const updShip = (i, patch) => setShips((a) => a.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const updTeam = (j, patch) => setTeams((a) => a.map((t, k) => (k === j ? { ...t, ...patch } : t)))
  const toggle = (arr, x) => (arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x])
  const fromBerth = () => setShips(berthShips.map((s, i) => ({ name: `T${i + 1}`, s: s.s, e: s.e, need: [B] })))

  return (
    <div className="layout">
      <aside>
        <section className="sec">
          <div className="sec-h">Thuật toán</div>
          {ALGOS.map((a) => (
            <button key={a.key} className={`algo ${algo === a.key ? 'on' : ''}`} onClick={() => setAlgo(a.key)} data-testid={`algo-${a.key}`}>
              <span className="radio" /><span><b>{a.name}</b><span className="d">{a.desc}</span></span>
            </button>
          ))}
        </section>

        <section className="sec">
          <div className="sec-h">Nguồn tàu</div>
          <div className="ctl">
            <button className="btn sm" onClick={fromBerth} disabled={!berthShips?.length} data-testid="from-berth">Lấy {berthShips?.length ?? 0} tàu từ module Thuê bến</button>
            <button className="btn sm" onClick={() => { setShips(DEFAULT_SHIPS); setTeams(DEFAULT_TEAMS) }}>Dữ liệu mẫu</button>
          </div>
          <p className="hint">Tàu trùng giờ không được chung đội. Khung giờ tàu ở bến chính là ca việc của đội.</p>
        </section>

        <section className="sec">
          <div className="sec-h"><span>Tàu · {ships.length}</span>
            <button className="iconbtn" title="Thêm tàu" onClick={() => setShips((a) => [...a, { name: `T${a.length + 1}`, s: 8, e: 12, need: [B] }])}>+</button></div>
          {ships.map((s, i) => (
            <div key={i} className={`m-row ${p && cur && cur.i === i ? 'cur' : ''}`}>
              <b>{s.name}</b>
              <span className="tm"><TimeInput value={s.s} onCommit={(v) => updShip(i, { s: v })} />–<TimeInput value={s.e} onCommit={(v) => updShip(i, { e: v })} /></span>
              <button className="xbtn" title="Xóa tàu" onClick={() => setShips((a) => a.filter((_, j) => j !== i).map((x, j) => ({ ...x, name: `T${j + 1}` })))}>×</button>
              <div className="m-sk">{SKILLS.map((k) => <button key={k} className={`skchip ${s.need.includes(k) ? 'on' : ''}`} onClick={() => updShip(i, { need: toggle(s.need, k) })}>{k}</button>)}</div>
            </div>
          ))}
        </section>

        <section className="sec">
          <div className="sec-h"><span>Đội phục vụ · {teams.length}</span>
            <button className="iconbtn" title="Thêm đội" onClick={() => setTeams((a) => [...a, { name: `Đội ${a.length + 1}`, skills: [B], rate: 100 }])}>+</button></div>
          {teams.map((t, j) => (
            <div key={j} className="m-row">
              <b>{t.name}</b>
              <span className="inp" style={{ height: 30, width: 110 }}><input type="number" min="0" value={t.rate} onChange={(e) => updTeam(j, { rate: e.target.value })} aria-label={`Đơn giá ${t.name}`} /><span className="u">/giờ</span></span>
              <button className="xbtn" title="Xóa đội" onClick={() => setTeams((a) => a.filter((_, k) => k !== j).map((x, k) => ({ ...x, name: `Đội ${k + 1}` })))}>×</button>
              <div className="m-sk">{SKILLS.map((k) => <button key={k} className={`skchip ${t.skills.includes(k) ? 'on' : ''}`} onClick={() => updTeam(j, { skills: toggle(t.skills, k) })}>{k}</button>)}</div>
            </div>
          ))}
          <p className="hint">Chi phí gán tàu i cho đội j = đơn giá[j] × số giờ[i].</p>
        </section>

        <section className="sec" style={{ marginTop: 'auto' }}>
          {validation && <div className="err">{validation}</div>}
          <button className="btn primary" disabled={loading || !!validation} onClick={() => run(input)} data-testid="run">{loading ? 'Đang chạy…' : data ? 'Chạy lại thuật toán' : 'Chạy thuật toán'}</button>
          {error ? <div className="err">{error}</div> : stale ? <div className="status stale">Dữ liệu đã đổi, bấm chạy lại để cập nhật.</div> : null}
        </section>
      </aside>

      <main>
        <div className="bar">
          <div className="tabs" role="tablist">
            {[['steps', 'Từng bước'], ['matrix', 'Ma trận chi phí'], ['compare', 'So sánh']].map(([k, l]) => (
              <button key={k} role="tab" className={tab === k ? 'on' : ''} onClick={() => setTab(k)} data-testid={`tab-${k}`}>{l}</button>
            ))}
          </div>
          {tab === 'steps' && steps.length > 0 && <Controls p={p} extra={algo === 'bt' && (
            <button type="button" className="btn sm" style={{ height: 30 }} onClick={() => { const j = steps.findIndex((s, i) => i > p.step && (s.kind === 'found' || s.kind === 'dead' || s.kind === 'done')); p.setStep(j < 0 ? p.last : j) }}>Nhảy tới sự kiện kế</button>)} />}
        </div>

        {!data && !error && <div className="empty">Đang giải bài toán…</div>}
        {data && tab === 'steps' && cur && <Steps algo={algo} data={data} res={res} steps={steps} p={p} cur={cur} sh={sh} tm={tm} />}
        {data && tab === 'matrix' && <Matrix data={data} sh={sh} tm={tm} assign={cur?.assign ?? []} />}
        {data && tab === 'compare' && (
          <CompareTable active={algo} onPick={(k) => { setAlgo(k); setTab('steps') }}
            rows={ALGOS.map((a) => { const r = data.results[a.key]; return { key: a.key, name: a.name, head: 'Tổng chi phí', rank: r.feasible ? r.cost : Infinity,
              valueText: r.feasible ? fmtNum(r.cost) : 'Không đủ nghiệm', gap: r.feasible && data.lb != null ? (r.cost <= data.lb + 1e-9 ? '= cận dưới' : `+${fmtNum(r.cost - data.lb)}`) : '–',
              steps: r.steps.length - 1, ms: r.ms, tag: a.key === 'bt' ? { ok: r.optimal, text: !r.optimal ? 'CHƯA CHẮC TỐI ƯU' : r.feasible ? 'TỐI ƯU' : 'VÔ NGHIỆM' } : null } })}
            note={`Cận dưới = mỗi tàu chọn đội đủ kỹ năng rẻ nhất, bỏ qua trùng giờ: ${data.lb != null ? fmtNum(data.lb) : 'không có (có tàu không đội nào đủ kỹ năng)'}. Bấm một dòng để xem thuật toán đó chạy từng bước.`} />
        )}
      </main>
    </div>
  )
}

function Steps({ algo, data, res, steps, p, cur, sh, tm }) {
  const assign = cur.assign
  const placed = assign.filter((j) => j >= 0).length
  const { cur: cl, ran } = lineSets(algo, cur.line)
  const ci = cur.i
  const cs = cur.cands ?? []
  const vars = [['i', ci >= 0 ? `${sh[ci].name} (${(cur.pos ?? 0) + 1} / ${sh.length})` : '–'],
    ['giờ[i]', ci >= 0 ? fmtNum(sh[ci].e - sh[ci].s) : '–'],
    ['ứng viên', ci >= 0 ? `{${cs.filter((c) => c.status !== 'blocked').map((c) => tm[c.team].name).join(', ') || '∅'}}` : '–'],
    ['tổng hiện tại', fmtNum(cur.total ?? 0)]]
  if (algo === 'bt') vars.push(['tốt nhất hiện có', cur.best != null ? fmtNum(cur.best) : 'chưa có'], ['cận', cur.bound != null ? fmtNum(cur.bound) : '–'])
  return (
    <>
      <Band step={cur} idx={p.step} last={p.last} kpis={[['ĐÃ XẾP', `${placed}/${sh.length}`], ['CHI PHÍ TẠM', fmtNum(cur.total ?? 0)], ['CẬN DƯỚI', data.lb != null ? fmtNum(data.lb) : '–']]} />
      <div className="stepview" style={{ gridTemplateColumns: '430px minmax(0,1fr)' }}>
        <div className="sv-left">
          <Code lines={PSEUDO[algo]} cur={cl} ran={ran} title={`Mã giả · ${ALGOS.find((a) => a.key === algo).name.toLowerCase()}`} />
          <VarsCard rows={vars} />
        </div>
        <div className="sv-main">
          <Lanes sh={sh} tm={tm} cur={cur} />
          {ci >= 0 && cs.length > 0 && <Decision sh={sh} tm={tm} i={ci} cands={cs} algo={algo} />}
          {algo === 'bt' && <BoundChart steps={steps} idx={p.step} lb={data.lb} />}
          {algo === 'bt' && <Trace steps={steps} idx={p.step} setStep={p.setStep} />}
          {res.truncated && algo === 'bt' && <div className="note"><span>Số bước quá nhiều nên chỉ hiển thị những bước đầu; kết quả cuối vẫn là kết quả của toàn bộ lần tìm.</span></div>}
        </div>
      </div>
    </>
  )
}

function Lanes({ sh, tm, cur }) {
  const lo = Math.floor(Math.min(...sh.map((s) => s.s))), hi = Math.ceil(Math.max(...sh.map((s) => s.e)))
  const pct = (t) => ((t - lo) / (hi - lo)) * 100
  const stepH = [1, 2, 3, 4, 6, 12].find((s) => (hi - lo) / s <= 10) ?? 24
  const ticks = []
  for (let t = Math.ceil(lo / stepH) * stepH; t <= hi + 1e-9; t += stepH) ticks.push(t)
  const ci = cur.i
  const cands = cur.cands ?? []
  const cost = (j) => cur.assign.reduce((t, k, i) => t + (k === j ? tm[j].rate * (sh[i].e - sh[i].s) : 0), 0)
  return (
    <section className="card" data-testid="lanes">
      <div className="card-h"><span>Lịch các đội</span><small>tàu đang xét viền nét đứt; vùng gạch đỏ là chỗ tàu bị loại</small></div>
      <div className="pad">
        <div className="lane-axis"><span /><div className="axis">{ticks.map((t) => <span className="tick" key={t} style={{ left: `${pct(t)}%` }}>{toHM(t)}</span>)}</div><span /></div>
        {tm.map((t, j) => {
          const cand = ci >= 0 ? cands.find((c) => c.team === j) : null
          const mine = sh.map((_, i) => i).filter((i) => cur.assign[i] === j)
          const ghost = cand && !mine.includes(ci) ? cand : null
          return (
            <div className="lane-row" key={j}>
              <div className="lane-nm"><b>{t.name}</b><small>{t.skills.join(', ') || 'không kỹ năng'} · {fmtNum(t.rate)}/giờ</small></div>
              <div className="track" style={{ height: 44 }}>
                {ticks.map((x) => <span key={x} className="grid-l" style={{ left: `${pct(x)}%` }} />)}
                {mine.map((i) => <span key={i} className={`blk ${i === ci ? 'now' : ''}`} style={{ left: `${pct(sh[i].s)}%`, width: `${pct(sh[i].e) - pct(sh[i].s)}%`, background: shipColor(i), top: 2, height: 40 }}>{sh[i].name}</span>)}
                {ghost && (
                  <span className={`blk ghost ${ghost.status === 'blocked' ? 'bad' : ghost.status === 'pruned' ? 'bad' : 'good'}`}
                    style={{ left: `${pct(sh[ci].s)}%`, width: `${pct(sh[ci].e) - pct(sh[ci].s)}%`, top: 2, height: 40 }}>
                    {sh[ci].name}{ghost.status === 'blocked' ? (ghost.reason.t === 'skill' ? ' thiếu kỹ năng' : ` trùng ${sh[ghost.reason.ship].name}`) : ghost.status === 'pruned' ? ' bỏ nhánh' : ` ${fmtNum(ghost.cost)}`}
                  </span>
                )}
              </div>
              <div className="cost"><b>{fmtNum(cost(j))}</b><small>đã gán</small></div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Decision({ sh, tm, i, cands, algo }) {
  const s = sh[i]
  const why = (c) => {
    if (c.status === 'blocked') return c.reason.t === 'skill' ? `thiếu kỹ năng ${s.need.filter((k) => !tm[c.team].skills.includes(k)).join(', ')}`
      : c.reason.t === 'time' ? `trùng giờ với ${sh[c.reason.ship].name} (${toHM(sh[c.reason.ship].s)}–${toHM(sh[c.reason.ship].e)})` : `ràng buộc với ${sh[c.reason.ship].name}`
    if (c.status === 'chosen') return algo === 'bt' ? 'đang thử đội này' : 'rẻ nhất trong các đội còn khả thi'
    if (c.status === 'pruned') return 'bỏ nhánh: không tốt hơn phương án tốt nhất hiện có'
    if (c.status === 'tried') return 'đã thử xong'
    return 'khả thi'
  }
  return (
    <section className="card" data-testid="decision">
      <div className="card-h"><span>Các lựa chọn cho tàu {s.name}</span><small>{toHM(s.s)}–{toHM(s.e)} · {fmtNum(s.e - s.s)} giờ · cần {s.need.join(', ') || 'không'}</small></div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Đội</th><th>Kỹ năng</th><th className="r">Đơn giá</th><th className="r">Chi phí</th><th>Kết luận</th></tr></thead>
          <tbody>
            {cands.map((c) => (
              <tr key={c.team} className={c.status === 'chosen' ? 'pick' : c.status === 'blocked' || c.status === 'pruned' ? 'no' : ''}>
                <td><b>{tm[c.team].name}</b></td><td>{tm[c.team].skills.join(', ')}</td><td className="r mono">{fmtNum(tm[c.team].rate)}</td>
                <td className="r mono">{c.status === 'blocked' && c.reason.t === 'skill' ? '–' : fmtNum(c.cost)}</td>
                <td><Verdict status={c.status} /> {why(c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Matrix({ data, sh, tm, assign }) {
  return (
    <section className="card">
      <div className="card-h"><span>Ma trận chi phí</span><small>đơn giá × số giờ; ô tô màu là đội đang được gán ở bước hiện tại</small></div>
      <div className="tbl-wrap">
        <table className="tbl" data-testid="matrix">
          <thead><tr><th>Tàu</th><th className="r">Giờ</th>{tm.map((t) => <th key={t.name} className="r">{t.name}</th>)}</tr></thead>
          <tbody>
            {sh.map((s, i) => (
              <tr key={i}><td><b>{s.name}</b> <span className="gloss">{s.need.join(', ')}</span></td><td className="r mono">{fmtNum(s.e - s.s)}</td>
                {tm.map((t, j) => {
                  const ok = s.need.every((k) => t.skills.includes(k))
                  return <td key={j} className={`r mono ${assign[i] === j ? 'cellhit' : ''}`} style={{ color: ok ? undefined : 'var(--ink-faint)' }}>{ok ? fmtNum(data.cost[i][j]) : '–'}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
