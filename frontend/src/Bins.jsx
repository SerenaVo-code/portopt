import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { solveBins } from './api.js'
import { Controls, usePlayer, Code, VarsCard, Band, Trace, BoundChart, Verdict, CompareTable } from './shared.jsx'
import { fmtNum } from './util.js'

const COLORS = ['#024D71', '#2C7A7B', '#9C4221', '#6B46C1', '#BD0F72', '#2F855A', '#B7791F', '#4A5568', '#3E7CB1', '#A0522D']
const col = (i) => COLORS[i % COLORS.length]
const DEFAULT_ITEMS = [14, 12, 10, 9, 8, 7, 6, 4].map((w, i) => ({ name: `C${i + 1}`, w }))

const ALGOS = [
  { key: 'ff', name: 'First-fit', desc: 'Giữ nguyên thứ tự nhập, xếp vào tàu đầu tiên còn đủ chỗ.' },
  { key: 'ffd', name: 'First-fit giảm dần', desc: 'Sắp lô nặng trước rồi áp dụng first-fit.' },
  { key: 'bfd', name: 'Best-fit giảm dần', desc: 'Xếp vào tàu vừa khít nhất (còn ít chỗ trống nhất).' },
  { key: 'bt', name: 'Quay lui + nhánh cận', desc: 'Thử mọi cách chia, bỏ nhánh khi số tàu không thể ít hơn phương án tốt nhất hiện có.' },
]
const FF = (first) => [[0, first], [0, 'với mỗi lô x:'], [1, 'với mỗi tàu t theo thứ tự đã mở:'], [2, 'nếu tải[t] + x ≤ C: xếp x vào t, sang lô kế'], [1, 'nếu không tàu nào vừa: mở tàu mới, xếp x vào']]
const PSEUDO = {
  ff: FF('giữ nguyên thứ tự nhập'),
  ffd: FF('sắp các lô theo khối lượng giảm dần'),
  bfd: [[0, 'sắp các lô theo khối lượng giảm dần'], [0, 'với mỗi lô x:'], [1, 'T ← các tàu đã mở có tải[t] + x ≤ C'], [1, 'nếu T khác rỗng: xếp x vào tàu còn ít chỗ trống nhất sau khi xếp'], [1, 'nếu không: mở tàu mới, xếp x vào']],
  bt: [[0, 'rec(p):  xếp lô thứ p (nặng trước)'], [1, 'nếu p = n: ghi lại nếu dùng ít tàu hơn; return'], [1, 'với mỗi tàu b đã mở còn đủ chỗ cho lô p:'],
    [2, 'xếp p vào b; rec(p+1); lấy ra  ← quay lui'], [1, 'nếu số tàu + 1 < tốt nhất: mở tàu mới, rec(p+1)  (ngược lại: bỏ nhánh)']],
}
function lineSets(algo, line) {
  const cur = new Set(), ran = new Set()
  if (!line) return { cur, ran }
  cur.add(line)
  if (algo === 'bt') { if (line === 4) ran.add(3) } else { if (line === 4) [2, 3].forEach((x) => ran.add(x)); if (line === 5) [2, 3, 4].forEach((x) => ran.add(x)) }
  if (algo === 'bt' && line === 5) ran.add(3)
  return { cur, ran }
}

export default function Bins() {
  const [items, setItems] = useState(DEFAULT_ITEMS)
  const [C, setC] = useState(30)
  const [algo, setAlgo] = useState('ffd')
  const [tab, setTab] = useState('steps')
  const [data, setData] = useState(null)
  const [solved, setSolved] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const input = useMemo(() => ({ items: items.map((x) => ({ ...x, w: Number(x.w) })), C: Number(C) }), [items, C])
  const stale = data && JSON.stringify(input) !== JSON.stringify(solved)
  const validation = useMemo(() => {
    if (!items.length) return 'Cần ít nhất 1 lô container.'
    if (!(Number(C) > 0)) return 'Tải trọng phải dương.'
    for (const x of items) if (!(Number(x.w) > 0 && Number(x.w) <= Number(C))) return `${x.name}: khối lượng phải trong (0, ${C}].`
    return ''
  }, [items, C])

  const run = useCallback(async (inp) => {
    setLoading(true); setError('')
    try { const d = await solveBins(inp); setData(d); setSolved(inp) } catch (e) { setError(e.message) } finally { setLoading(false) }
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
          <div className="sec-h">Tải trọng</div>
          <label className="field">Mỗi tàu chịu tối đa
            <div className="inp"><input type="number" min="1" value={C} onChange={(e) => setC(e.target.value)} data-testid="inp-C" /><span className="u">tấn</span></div>
          </label>
        </section>
        <section className="sec">
          <div className="sec-h"><span>Lô container · {items.length}</span><span className="mono" style={{ letterSpacing: 0 }}>Σ = {fmtNum(items.reduce((t, x) => t + Number(x.w || 0), 0))} t</span></div>
          <div className="k-h b"><span>Lô</span><span>Khối lượng</span><span /></div>
          {items.map((x, i) => (
            <div key={i} className={`k-row b ${cur && cur.x === i ? 'cur' : ''}`}>
              <b>{x.name}</b>
              <span className="inp" style={{ height: 30 }}><input type="number" min="0" step="0.5" value={x.w} onChange={(e) => upd(i, { w: e.target.value })} aria-label={`Khối lượng ${x.name}`} /><span className="u">t</span></span>
              <button className="xbtn" title="Xóa" onClick={() => setItems((a) => a.filter((_, j) => j !== i).map((y, j) => ({ ...y, name: `C${j + 1}` })))}>×</button>
            </div>
          ))}
          <div className="ctl">
            <button className="btn sm" onClick={() => setItems((a) => [...a, { name: `C${a.length + 1}`, w: 5 }])}>Thêm lô</button>
            <button className="btn sm" onClick={() => { setItems(DEFAULT_ITEMS); setC(30) }}>Dữ liệu mẫu</button>
          </div>
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
        {data && tab === 'steps' && cur && <Steps algo={algo} data={data} res={res} steps={steps} p={p} cur={cur} its={its} C={solved.C} />}
        {data && tab === 'compare' && (
          <CompareTable active={algo} onPick={(k) => { setAlgo(k); setTab('steps') }}
            rows={ALGOS.map((a) => { const r = data.results[a.key]; return { key: a.key, name: a.name, head: 'Số tàu', rank: r.used, valueText: `${r.used} tàu`,
              gap: r.used <= data.lb ? '= cận dưới' : `+${r.used - data.lb}`, steps: r.steps.length - 1, ms: r.ms,
              tag: a.key === 'bt' ? { ok: r.optimal, text: r.optimal ? 'TỐI ƯU' : 'CHƯA CHẮC TỐI ƯU' } : null } })}
            note={`Cận dưới = ⌈tổng ${fmtNum(data.total)} t / ${fmtNum(data.C)} t⌉ = ${data.lb} tàu. Số tàu không thể thấp hơn. Bấm một dòng để xem thuật toán đó chạy từng bước.`} />
        )}
      </main>
    </div>
  )
}

function Steps({ algo, data, res, steps, p, cur, its, C }) {
  const { cur: cl, ran } = lineSets(algo, cur.line)
  const x = cur.x
  const placedW = cur.loads.reduce((t, v) => t + v, 0)
  const order = res.order
  const pos = cur.pos ?? -1
  const waiting = cur.kind === 'done' ? [] : order.filter((_, k) => k > (cur.kind === 'info' ? -1 : pos))
  const vars = [['x', x >= 0 ? `${its[x].name} = ${fmtNum(its[x].w)} t` : '–'], ['C', fmtNum(C)],
    ['tàu đang mở', cur.used], ['tải các tàu', cur.loads.length ? cur.loads.map(fmtNum).join(', ') : '–']]
  if (algo === 'bt') vars.push(['tốt nhất hiện có', cur.best != null ? `${cur.best} tàu` : '–'])
  const cs = cur.cands ?? []
  return (
    <>
      <Band step={cur} idx={p.step} last={p.last} kpis={[['SỐ TÀU ĐANG DÙNG', cur.used], ['CẬN DƯỚI', data.lb], ['ĐÃ XẾP', `${fmtNum(placedW)}/${fmtNum(data.total)} t`]]} />
      <div className="stepview" style={{ gridTemplateColumns: '430px minmax(0,1fr)' }}>
        <div className="sv-left">
          <Code lines={PSEUDO[algo]} cur={cl} ran={ran} title={`Mã giả · ${ALGOS.find((a) => a.key === algo).name.toLowerCase()}`} />
          <VarsCard rows={vars} />
        </div>
        <div className="sv-main">
          <section className="card" data-testid="holds">
            <div className="card-h"><span>Hầm hàng các tàu</span><small>độ dài thanh tỉ lệ với tải trọng {fmtNum(C)} t</small></div>
            <div className="pad">
              <div className="hold-scale"><span /><div><span>0</span><span>{fmtNum(C / 3)}</span><span>{fmtNum((2 * C) / 3)}</span><span>{fmtNum(C)} t</span></div><span /></div>
              {cur.bins.map((b, k) => (
                <div className="hold-row" key={k}>
                  <div className="hold-nm">Tàu {k + 1}<small>{b.length} lô</small></div>
                  <div className="hold">
                    {b.map((i) => <div key={i} className={`seg-c ${i === x && cur.kind === 'place' ? 'cur' : ''}`} style={{ width: `${(its[i].w / C) * 100}%`, background: col(i) }} title={`${its[i].name} ${its[i].w} t`}>{its[i].name} · {fmtNum(its[i].w)}</div>)}
                    <div className="free">{fmtNum(C - cur.loads[k])}</div>
                  </div>
                  <div className="mono hold-ld">{fmtNum(cur.loads[k])} / {fmtNum(C)} t</div>
                </div>
              ))}
              {cur.kind !== 'done' && <div className="hold-row"><div className="hold-nm">Tàu {cur.bins.length + 1}<small>chưa mở</small></div><div className="hold empty"><div className="free" style={{ fontFamily: 'inherit' }}>mở khi không tàu nào còn vừa</div></div><div className="mono hold-ld" style={{ color: 'var(--ink-faint)' }}>0 / {fmtNum(C)} t</div></div>}
              {waiting.length > 0 && <div className="chips" style={{ marginTop: 12, alignItems: 'center' }}><span className="hint">Chờ xếp:</span>{waiting.map((i) => <span key={i} className="v pend">{its[i].name} · {fmtNum(its[i].w)} t</span>)}</div>}
            </div>
          </section>

          {x >= 0 && cs.length > 0 && (
            <section className="card" data-testid="decision">
              <div className="card-h"><span>Các lựa chọn cho lô {its[x].name}</span><small>{fmtNum(its[x].w)} tấn</small></div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr><th>Tàu</th><th className="r">Đang chở</th><th className="r">Còn trống</th><th className="r">Sau khi xếp</th><th>Kết luận</th></tr></thead>
                  <tbody>
                    {cs.map((c) => {
                      const isNew = c.bin >= cur.bins.length && c.status !== 'chosen'
                      return (
                        <tr key={c.bin} className={c.status === 'chosen' ? 'pick' : c.status === 'blocked' ? 'no' : ''}>
                          <td><b>Tàu {c.bin + 1}</b> {c.bin >= (cs.length - 1) && <span className="gloss">chưa mở</span>}</td>
                          <td className="r mono">{fmtNum(c.load)} t</td><td className="r mono">{fmtNum(c.free)} t</td><td className="r mono">{fmtNum(c.after)} t</td>
                          <td>{c.status === 'blocked' ? <><Verdict status="blocked" /> vượt tải trọng {fmtNum(c.after - C)} t</>
                            : c.status === 'chosen' ? <><Verdict status="chosen" /> {cur.line === 5 ? 'mở tàu mới' : algo === 'bt' ? 'đang thử' : algo === 'bfd' ? 'vừa khít nhất' : 'tàu đầu tiên còn đủ chỗ'}</>
                              : c.status === 'new' || isNew ? <span className="v pend">KHÔNG XÉT</span> : c.status === 'tried' ? <Verdict status="tried" /> : <><Verdict status="ok" /> còn đủ chỗ{algo === 'ff' || algo === 'ffd' ? ' nhưng đứng sau' : ''}</>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {algo === 'bt' && <BoundChart steps={steps} idx={p.step} lb={data.lb} valKey="used" label="Số tàu theo từng bước" sub="đường xám là số tàu đang dùng; đường xanh là phương án tốt nhất hiện có" />}
          {algo === 'bt' && <Trace steps={steps} idx={p.step} setStep={p.setStep} />}
        </div>
      </div>
    </>
  )
}
