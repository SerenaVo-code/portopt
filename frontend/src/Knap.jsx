import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { solveKnap } from './api.js'
import { Controls, usePlayer, Code, VarsCard, Band, Trace, BoundChart, CompareTable } from './shared.jsx'
import { fmtNum } from './util.js'

const DEFAULT_ITEMS = [['Sửa cẩu RTG', 3, 40], ['Tiếp nhiên liệu', 4, 50], ['Bốc dỡ thêm', 5, 70], ['Kiểm định an toàn', 2, 30]]
  .map(([name, w, v]) => ({ name, w, v }))

const ALGOS = [
  { key: 'greedy', name: 'Tham lam theo giá trị/giờ', desc: 'Lấy yêu cầu có giá trị trên mỗi giờ cao nhất trước, đến khi hết quỹ.' },
  { key: 'dp', name: 'Quy hoạch động', desc: 'Điền bảng dp[i][w]: giá trị lớn nhất khi xét i yêu cầu đầu với quỹ w giờ.' },
  { key: 'bt', name: 'Quay lui + nhánh cận', desc: 'Mỗi yêu cầu thử lấy hoặc bỏ, bỏ nhánh khi cận trên không vượt phương án tốt nhất hiện có.' },
]
const PSEUDO = {
  greedy: [[0, 'sắp yêu cầu theo giá trị/giờ giảm dần'], [0, 'với mỗi yêu cầu i theo thứ tự:'], [1, 'nếu giờ[i] ≤ quỹ còn:'], [2, 'lấy i; quỹ ← quỹ − giờ[i]'], [1, 'ngược lại: bỏ qua i']],
  dp: [[0, 'dp[0][w] ← 0 với mọi w'], [0, 'với i = 1..n:'], [1, 'với w = 0..W:'], [2, 'dp[i][w] ← dp[i−1][w]'], [2, 'nếu giờ[i] ≤ w:'],
    [3, 'dp[i][w] ← max(·, gt[i] + dp[i−1][w−giờ[i]])'], [0, 'truy vết ngược từ dp[n][W]']],
  bt: [[0, 'rec(p, quỹ còn, giá trị):'], [1, 'cập nhật phương án tốt nhất nếu giá trị lớn hơn'], [1, 'nếu cận trên ≤ tốt nhất: bỏ nhánh; return'],
    [1, 'nếu đủ quỹ: lấy p; rec(p+1); bỏ lấy  ← quay lui'], [1, 'không lấy p; rec(p+1)']],
}
function lineSets(algo, line) {
  const cur = new Set(), ran = new Set()
  if (!line) return { cur, ran }
  cur.add(line)
  if (algo === 'greedy' && (line === 4 || line === 5)) [2, 3].forEach((x) => ran.add(x))
  if (algo === 'dp') { if (line === 6) [2, 3, 4, 5].forEach((x) => ran.add(x)); if (line === 4) [2, 3].forEach((x) => ran.add(x)) }
  return { cur, ran }
}

export default function Knap() {
  const [items, setItems] = useState(DEFAULT_ITEMS)
  const [W, setW] = useState(8)
  const [algo, setAlgo] = useState('dp')
  const [tab, setTab] = useState('steps')
  const [data, setData] = useState(null)
  const [solved, setSolved] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const input = useMemo(() => ({ items: items.map((x) => ({ ...x, w: Number(x.w), v: Number(x.v) })), W: Number(W) }), [items, W])
  const stale = data && JSON.stringify(input) !== JSON.stringify(solved)
  const validation = useMemo(() => {
    if (!items.length) return 'Cần ít nhất 1 yêu cầu.'
    if (!Number.isInteger(Number(W)) || Number(W) < 0 || Number(W) > 200) return 'Quỹ giờ công phải là số nguyên từ 0 đến 200.'
    for (const x of items) if (!Number.isInteger(Number(x.w)) || Number(x.w) < 1 || !(Number(x.v) >= 0)) return `${x.name}: giờ phải là số nguyên ≥ 1 và giá trị ≥ 0.`
    if (items.length * (Number(W) + 1) > 4000) return 'Bảng quá lớn (số yêu cầu × quỹ tối đa khoảng 4000 ô).'
    return ''
  }, [items, W])

  const run = useCallback(async (inp) => {
    setLoading(true); setError('')
    try { const d = await solveKnap(inp); setData(d); setSolved(inp) } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [])
  useEffect(() => { run(input) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const res = data?.results[algo]
  const steps = res?.steps ?? []
  const p = usePlayer(steps)
  useEffect(() => { p.jumpEnd() }, [data, algo]) // eslint-disable-line react-hooks/exhaustive-deps
  const cur = steps[p.step]
  const its = solved?.items ?? input.items
  const upd = (i, patch) => setItems((a) => a.map((x, j) => (j === i ? { ...x, ...patch } : x)))

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
          <div className="sec-h">Quỹ giờ công</div>
          <label className="field">Tổng giờ công tăng ca còn lại
            <div className="inp"><input type="number" min="0" max="200" value={W} onChange={(e) => setW(e.target.value)} data-testid="inp-W" /><span className="u">giờ</span></div>
          </label>
          <p className="hint">Giá trị là điểm do người điều phối đặt cho từng yêu cầu (doanh thu hoặc mức ưu tiên).</p>
        </section>
        <section className="sec">
          <div className="sec-h"><span>Yêu cầu thêm · {items.length}</span>
            <button className="iconbtn" title="Thêm yêu cầu" onClick={() => setItems((a) => [...a, { name: `Yêu cầu ${a.length + 1}`, w: 2, v: 20 }])}>+</button></div>
          <div className="k-h"><span>#</span><span>Yêu cầu</span><span>Giờ</span><span>Giá trị</span><span /></div>
          {items.map((x, i) => (
            <div key={i} className={`k-row ${cur && cur.i === i ? 'cur' : ''}`}>
              <b>{i + 1}</b>
              <input className="k-in" value={x.name} onChange={(e) => upd(i, { name: e.target.value })} aria-label="Tên yêu cầu" />
              <input className="k-in mono" type="number" min="1" value={x.w} onChange={(e) => upd(i, { w: e.target.value })} aria-label="Số giờ" />
              <input className="k-in mono" type="number" min="0" value={x.v} onChange={(e) => upd(i, { v: e.target.value })} aria-label="Giá trị" />
              <button className="xbtn" title="Xóa" onClick={() => setItems((a) => a.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          <button className="btn sm" onClick={() => { setItems(DEFAULT_ITEMS); setW(8) }}>Dữ liệu mẫu</button>
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
            {[['steps', 'Từng bước'], ['compare', 'So sánh']].map(([k, l]) => (
              <button key={k} role="tab" className={tab === k ? 'on' : ''} onClick={() => setTab(k)} data-testid={`tab-${k}`}>{l}</button>
            ))}
          </div>
          {tab === 'steps' && steps.length > 0 && <Controls p={p} extra={algo === 'bt' && (
            <button type="button" className="btn sm" style={{ height: 30 }} onClick={() => { const j = steps.findIndex((s, i) => i > p.step && (s.kind === 'found' || s.kind === 'prune' || s.kind === 'done')); p.setStep(j < 0 ? p.last : j) }}>Nhảy tới sự kiện kế</button>)} />}
        </div>
        {!data && !error && <div className="empty">Đang giải bài toán…</div>}
        {data && tab === 'steps' && cur && <Steps algo={algo} data={data} res={res} steps={steps} p={p} cur={cur} its={its} W={solved.W} />}
        {data && tab === 'compare' && (() => {
          const opt = data.results.dp.value
          return <CompareTable active={algo} onPick={(k) => { setAlgo(k); setTab('steps') }}
            rows={ALGOS.map((a) => { const r = data.results[a.key]; return { key: a.key, name: a.name, head: 'Tổng giá trị', rank: -r.value, valueText: `${fmtNum(r.value)} (${r.hours}/${data.W} giờ)`,
              gap: r.value >= opt - 1e-9 ? '= tối ưu' : `−${fmtNum(opt - r.value)}`, steps: r.steps.length - 1, ms: r.ms,
              tag: a.key === 'greedy' ? { ok: r.value >= opt - 1e-9, text: r.value >= opt - 1e-9 ? 'TRÙNG TỐI ƯU' : 'KHÔNG TỐI ƯU' } : { ok: r.optimal !== false, text: 'TỐI ƯU' } } })}
            note="Tham lam theo giá trị/giờ có thể bỏ lỡ cách ghép vừa khít quỹ giờ; quy hoạch động và quay lui đều tìm đúng nghiệm tối ưu." />
        })()}
      </main>
    </div>
  )
}

function Steps({ algo, data, res, steps, p, cur, its, W }) {
  const { cur: cl, ran } = lineSets(algo, cur.line)
  const ratioOrder = useMemo(() => its.map((_, i) => i).sort((a, b) => its[b].v / its[b].w - its[a].v / its[a].w || a - b), [its])
  let kpis, vars
  if (algo === 'dp') {
    const cellSteps = steps.slice(0, p.step + 1).filter((s) => s.kind === 'cell')
    const filled = cellSteps.length
    const total = its.length * (W + 1)
    kpis = [['Ô ĐÃ ĐIỀN', `${filled}/${total}`], ['Ô VỪA ĐIỀN', cur.kind === 'cell' ? `dp[${cur.i}][${cur.w}] = ${fmtNum(cur.val)}` : '–'], ['QUỸ GIỜ', W]]
    vars = cur.kind === 'cell' ? [['i, w', `${cur.i}, ${cur.w}`], ['giờ[i], gt[i]', `${its[cur.i - 1].w}, ${fmtNum(its[cur.i - 1].v)}`], ['w − giờ[i]', its[cur.i - 1].w <= cur.w ? cur.w - its[cur.i - 1].w : 'không đủ']] : [['i, w', '–']]
  } else {
    const used = cur.take ? its.reduce((t, x, i) => t + (cur.take[i] ? x.w : 0), 0) : 0
    kpis = [['GIÁ TRỊ HIỆN TẠI', fmtNum(cur.total ?? 0)], ['QUỸ CÒN', cur.left ?? W], algo === 'bt' ? ['TỐT NHẤT HIỆN CÓ', cur.best != null ? fmtNum(cur.best) : 'chưa có'] : ['ĐÃ DÙNG', `${used}/${W}`]]
    vars = [['yêu cầu đang xét', cur.i >= 0 ? `${cur.i + 1} · ${its[cur.i].name}` : '–'], ['quỹ còn', cur.left ?? W], ['giá trị', fmtNum(cur.total ?? 0)]]
    if (algo === 'bt') vars.push(['cận trên', cur.bound != null ? fmtNum(cur.bound) : '–'])
  }
  return (
    <>
      <Band step={cur} idx={p.step} last={p.last} kpis={kpis} />
      <div className="stepview" style={{ gridTemplateColumns: '430px minmax(0,1fr)' }}>
        <div className="sv-left">
          <Code lines={PSEUDO[algo]} cur={cl} ran={ran} title={`Mã giả · ${ALGOS.find((a) => a.key === algo).name.toLowerCase()}`} />
          <VarsCard rows={vars} />
        </div>
        <div className="sv-main">
          {algo === 'dp' ? <DpTable its={its} W={W} steps={steps} idx={p.step} cur={cur} /> : <ItemTable its={its} order={ratioOrder} cur={cur} algo={algo} W={W} />}
          {algo === 'dp' && cur.kind === 'cell' && <TwoWays its={its} cur={cur} />}
          {algo === 'bt' && <BoundChart steps={steps} idx={p.step} lb={null} minimize={false} label="Cận trên theo từng bước" />}
          {algo === 'bt' && <Trace steps={steps} idx={p.step} setStep={p.setStep} />}
        </div>
      </div>
    </>
  )
}

function DpTable({ its, W, steps, idx, cur }) {
  const n = its.length
  const grid = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: W + 1 }, () => (i === 0 ? 0 : null)))
  const traced = new Set()
  steps.slice(0, idx + 1).forEach((s) => {
    if (s.kind === 'cell') grid[s.i][s.w] = s.val
    if (s.kind === 'trace' && s.took) traced.add(`${s.i},${s.w}`)
  })
  const isCell = cur.kind === 'cell'
  const A = isCell ? `${cur.i - 1},${cur.w}` : null
  const Bk = isCell && cur.takev != null ? `${cur.i - 1},${cur.w - its[cur.i - 1].w}` : null
  return (
    <section className="card">
      <div className="card-h"><span>Bảng dp[i][w]</span><small>hàng = số yêu cầu đã xét, cột = quỹ giờ</small></div>
      <div className="pad">
        <div className="tbl-wrap">
          <table className="dp" data-testid="dp">
            <thead><tr><th />{Array.from({ length: W + 1 }, (_, w) => <th key={w}>{w === 0 ? 'w=0' : w}</th>)}</tr></thead>
            <tbody>
              {grid.map((row, i) => (
                <tr key={i}>
                  <th className="rh">{i === 0 ? '0 · chưa xét' : `${i} · ${its[i - 1].name} (${its[i - 1].w}h, ${fmtNum(its[i - 1].v)})`}</th>
                  {row.map((v, w) => {
                    const key = `${i},${w}`
                    const c = isCell && cur.i === i && cur.w === w
                    const cls = c ? 'c' : key === A ? 'a' : key === Bk ? 'b' : v === null ? 'p' : i === 0 ? 'z' : traced.has(key) ? 't' : ''
                    return <td key={w} className={cls}>{v === null ? '·' : fmtNum(v)}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="legend-i hint" style={{ marginTop: 10 }}>
          <span><i className="sq" style={{ background: '#BD0F72' }} />ô đang điền</span>
          <span><i className="sq" style={{ border: '2px solid #024D71' }} />dp[i−1][w]: không lấy</span>
          <span><i className="sq" style={{ border: '2px solid #9C4221' }} />dp[i−1][w−giờ]: lấy</span>
          <span><i className="sq" style={{ background: '#D9F0E3', border: '1px solid #1E8E5A' }} />đường truy vết</span>
        </div>
      </div>
    </section>
  )
}

function TwoWays({ its, cur }) {
  const it = its[cur.i - 1]
  return (
    <section className="card">
      <div className="card-h"><span>Hai cách cho ô dp[{cur.i}][{cur.w}]</span></div>
      <div className="pad opts">
        <div className={`opt ${!cur.took ? 'best' : ''}`}><small>Không lấy {it.name}</small><b>dp[{cur.i - 1}][{cur.w}] = {fmtNum(cur.skip)}</b></div>
        <div className={`opt ${cur.took ? 'best' : ''}`}><small>Lấy {it.name}{cur.takev == null ? ' (không đủ giờ)' : ''}</small>
          <b>{cur.takev == null ? '–' : `${fmtNum(it.v)} + dp[${cur.i - 1}][${cur.w - it.w}] = ${fmtNum(cur.takev)}`}</b></div>
        <div className="opt" style={{ background: 'var(--surface-teal)' }}><small>Kết quả</small><b>dp[{cur.i}][{cur.w}] = {fmtNum(cur.val)}</b></div>
      </div>
    </section>
  )
}

function ItemTable({ its, order, cur, algo, W }) {
  const done = cur.kind === 'done'
  const pos = cur.pos ?? -1
  return (
    <section className="card">
      <div className="card-h"><span>Yêu cầu theo giá trị/giờ giảm dần</span><small>quỹ {W} giờ</small></div>
      <div className="tbl-wrap">
        <table className="tbl" data-testid="items">
          <thead><tr><th>#</th><th>Yêu cầu</th><th className="r">Giờ</th><th className="r">Giá trị</th><th className="r">GT/giờ</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {order.map((i, k) => {
              const taken = cur.take?.[i]
              const handled = done || (algo === 'greedy' ? k <= pos && cur.kind !== 'info' : k < (cur.depth ?? 0))
              const now = cur.i === i && !done
              return (
                <tr key={i} className={taken ? 'pick' : now ? 'now' : ''}>
                  <td><b>{i + 1}</b></td><td>{its[i].name}</td><td className="r mono">{its[i].w}</td><td className="r mono">{fmtNum(its[i].v)}</td><td className="r mono">{(its[i].v / its[i].w).toFixed(1)}</td>
                  <td>{taken ? <span className="v pick">LẤY</span> : now ? <span className="v ok">ĐANG XÉT</span> : handled ? <span className="v no">BỎ</span> : <span className="v pend">CHỜ</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
