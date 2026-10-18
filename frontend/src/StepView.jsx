import React, { useEffect, useMemo, useRef } from 'react'
import { contractsOf, toHM, fmtNum, colorOf, tintOf } from './util.js'

/* ---------- Mã giả: số dòng khớp trường `line` mà backend trả về ---------- */
const PSEUDO = {
  greedy: [
    [0, 'sắp tàu theo giờ đến'],
    [0, 'for v in tàu:'],
    [1, 'for k = HĐ1, HĐ2, ...:'],
    [2, 'if k không xung đột với v:'],
    [3, 'gán v vào k; break'],
  ],
  best: [
    [0, 'sắp tàu theo giờ đến'],
    [0, 'for v in tàu:'],
    [1, 'for k in các HĐ đang có:'],
    [2, 'if k xung đột với v: continue'],
    [2, 'Δ[k] = r × (rời(v) − rảnh(k))'],
    [1, 'Δmới = F + r × dur(v)'],
    [1, 'if min Δ[k] ≤ Δmới:'],
    [2, 'nối v vào HĐ có Δ nhỏ nhất'],
    [1, 'else: mở HĐ mới cho v'],
  ],
  dsatur: [
    [0, 'while còn tàu chưa xếp:'],
    [1, 'v = tàu có nhiều HĐ bị chặn nhất'],
    [1, 'k = HĐ nhỏ nhất không xung đột với v'],
    [1, 'gán v vào k'],
  ],
  bt: [
    [0, 'rec(i, chiPhí):'],
    [1, 'if i = n: ghi lại tốt nhất; return'],
    [1, 'v = tàu thứ i'],
    [1, 'for lựa chọn, rẻ trước:'],
    [2, 'cận = chiPhí + Δ + cận dưới còn lại'],
    [2, 'if cận ≥ tốt_nhất: bỏ nhánh'],
    [2, 'gán v; rec(i+1, ...)'],
    [2, 'bỏ gán v  ← quay lui (lùi lại)'],
  ],
}
// dòng đang chạy / dòng đã chạy trong cùng lượt, theo thuật toán và dòng của bước
function lineState(algo, line) {
  const cur = new Set(), ran = new Set()
  if (!line) return { cur, ran }
  cur.add(line)
  if (algo === 'greedy' && line === 5) [2, 3, 4].forEach((x) => ran.add(x))
  if (algo === 'best' && line >= 8) { cur.add(7); [2, 3, 4, 5, 6].forEach((x) => ran.add(x)) }
  if (algo === 'dsatur' && line === 4) [1, 2, 3].forEach((x) => ran.add(x))
  if (algo === 'bt') {
    if (line === 7) [3, 4, 5, 6].forEach((x) => ran.add(x))
    if (line === 6) [3, 4, 5].forEach((x) => ran.add(x))
  }
  return { cur, ran }
}

const mono = { fontFamily: 'var(--mono)' }
const money = (v) => fmtNum(v)

function Pseudo({ algo, line }) {
  const { cur, ran } = lineState(algo, line)
  return (
    <section className="card">
      <div className="card-h"><span>Mã giả</span><small>dòng đang chạy được tô màu</small></div>
      <div className="code">
        {PSEUDO[algo].map(([ind, txt], i) => {
          const n = i + 1
          const cls = cur.has(n) ? 'cur' : ran.has(n) ? 'ran' : ''
          return (
            <div key={n} className={`cl ${cls}`}>
              <span className="ln">{n}</span>
              <span style={{ paddingLeft: ind * 14 }}>{txt}</span>
            </div>
          )
        })}
      </div>
      <div className="card-f">
        <span><i className="sw ran" />đã chạy</span><span><i className="sw cur" />đang chạy</span>
      </div>
    </section>
  )
}

function Row({ k, v, tone }) {
  return <div className={`vr ${tone || ''}`}><span>{k}</span><b className="mono">{v}</b></div>
}

function Vars({ algo, step, ships, n, lbCost, pos }) {
  const rows = []
  const c = step.cur >= 0 ? ships[step.cur] : null
  if (algo === 'bt') {
    rows.push(<Row key="i" k="i / n" v={`${c ? pos : step.depth ?? 0} / ${n}${c ? ` (${c.name})` : ''}`} />)
    rows.push(<Row key="c" k="chiPhí" v={money(step.cost)} />)
    rows.push(<Row key="b" k="tốt nhất hiện có" v={step.best == null ? 'chưa có' : money(step.best)} tone={step.best == null ? '' : 'good'} />)
    rows.push(<Row key="l" k="cận dưới toàn bài (thấp nhất có thể)" v={money(lbCost)} />)
    if (step.kind === 'dead' && step.cands) {
      const ev = step.cands.filter((x) => x.status === 'pruned').length
      rows.push(<div key="r" className="vr bad"><span>cận ≥ tốt nhất: {ev}/{ev}</span><b>Bỏ nhánh</b></div>)
    }
  } else if (c && step.cands) {
    rows.push(<Row key="v" k="v" v={c.name} />)
    rows.push(<Row key="d" k="dur(v)" v={`${fmtNum(c.e - c.s)} giờ`} />)
    step.cands.forEach((x) => {
      const name = x.new ? 'Δmới' : `Δ[HĐ${x.k + 1}]`
      if (x.status === 'blocked') rows.push(<div key={x.k} className="vr"><span>{name}</span><span className="bad-t">bị chặn</span></div>)
      else rows.push(<Row key={x.k} k={name} v={money(x.delta)} tone={x.status === 'chosen' ? 'good' : ''} />)
    })
    const ch = step.cands.find((x) => x.status === 'chosen')
    if (ch) rows.push(<div key="res" className="vr res"><span>Kết quả</span><b>{ch.new ? `Mở HĐ${ch.k + 1}` : `Nối vào HĐ${ch.k + 1}`}</b></div>)
  } else {
    rows.push(<Row key="c" k="Tổng chi phí" v={money(step.cost)} />)
    rows.push(<Row key="l" k="Cận dưới (thấp nhất có thể)" v={money(lbCost)} />)
  }
  return (
    <section className="card">
      <div className="card-h"><span>Biến tại bước này</span></div>
      <div className="vars">{rows}</div>
    </section>
  )
}

/* ---------- Dải đầu bước: giải thích một câu ---------- */
function headline(algo, step, ships, steps) {
  const c = step.cur >= 0 ? ships[step.cur] : null
  const ch = step.cands?.find((x) => x.status === 'chosen' || x.status === 'current')
  if (algo === 'bt') {
    if (step.kind === 'dead') return `Mọi lựa chọn cho ${c.name} đều không thể rẻ hơn phương án tốt nhất hiện có (${money(step.best)}), nên bỏ nhánh này.`
    if (step.kind === 'found') return `Xếp xong cả ${ships.length} tàu với chi phí ${money(step.cost)}: ghi lại làm phương án tốt nhất hiện có.`
    if (step.kind === 'back') return `Quay lui: bỏ ${c.name} khỏi HĐ${step.row + 1}, thử lựa chọn tiếp theo.`
    if (step.kind === 'assign') return `Thử gán ${c.name} vào HĐ${step.row + 1}${ch ? ` (+${money(ch.delta)})` : ''}, tổng chi phí ${money(step.cost)}.`
    return step.msg
  }
  if (step.kind !== 'assign' || !ch) return step.msg
  const nw = step.cands.find((x) => x.new)
  const joins = step.cands.filter((x) => !x.new && x.status !== 'blocked')
  if (algo === 'greedy') return ch.new ? `Không hợp đồng nào dùng được, mở HĐ${ch.k + 1} (+${money(ch.delta)}).` : `Chọn HĐ${ch.k + 1}: hợp đồng có số nhỏ nhất còn dùng được (+${money(ch.delta)}).`
  if (algo === 'dsatur') return `Chọn ${c.name} trước vì có ${step.sat} hợp đồng bị chặn, ${step.deg} xung đột. Gán vào HĐ${ch.k + 1} (+${money(ch.delta)}).`
  if (!ch.new) return nw.delta - ch.delta > 1e-9 ? `Nối vào HĐ${ch.k + 1} chỉ tốn thêm ${money(ch.delta)}, rẻ hơn mở hợp đồng mới (${money(nw.delta)}).` : `Nối vào HĐ${ch.k + 1} tốn thêm ${money(ch.delta)}, không đắt hơn mở hợp đồng mới.`
  return joins.length ? `Nối vào hợp đồng có sẵn đắt hơn mở mới (${money(nw.delta)}), nên mở HĐ${ch.k + 1}.` : `Không hợp đồng nào dùng được, mở HĐ${ch.k + 1} (+${money(ch.delta)}).`
}

const KIND_TITLE = { info: 'GIỚI THIỆU', assign: 'GÁN', back: 'QUAY LUI', found: 'TÌM ĐƯỢC', dead: 'BỎ NHÁNH', done: 'HOÀN TẤT' }

function Band({ algo, step, idx, total, ships, steps }) {
  const c = step.cur >= 0 ? ships[step.cur] : null
  const tone = step.kind === 'dead' ? 'bad' : step.kind === 'found' || step.kind === 'done' ? 'good' : ''
  const prev = idx > 0 ? steps[idx - 1].cost : 0
  return (
    <section className={`band ${tone}`}>
      <div className="band-n">{c ? c.name.replace(/\D+/g, '') : step.kind === 'done' ? '✓' : '·'}</div>
      <div className="band-t">
        <div className="band-k">
          <b>BƯỚC {idx} / {total} · {KIND_TITLE[step.kind]}{c ? ` · ${c.name.toUpperCase()}` : ''}</b>
          {c && <span className="mono">{toHM(c.s)}–{toHM(c.e)} · {fmtNum(c.e - c.s)} giờ</span>}
        </div>
        <div className="band-h">{headline(algo, step, ships, steps)}</div>
      </div>
      <div className="band-r">
        {algo === 'bt' ? (
          <>
            <div><small>ĐANG ĐI</small><b className="mono">{money(step.cost)}</b></div>
            <div><small>TỐT NHẤT HIỆN CÓ</small><b className="mono good-t">{step.best == null ? '–' : money(step.best)}</b></div>
          </>
        ) : (
          <div><small>TỔNG CHI PHÍ</small><b className="mono">{money(prev)} <span style={{ color: 'var(--ink-faint)' }}>→</span> {money(step.cost)}</b></div>
        )}
      </div>
    </section>
  )
}

/* ---------- Bảng ứng viên: mỗi hợp đồng một dòng, kết luận bên phải ---------- */
function Decision({ algo, step, ships, F, r, bounds }) {
  const c = ships[step.cur]
  const before = useMemo(() => {
    const col = step.col.slice()
    col[step.cur] = -1
    return contractsOf(ships, col, F, r)
  }, [step, ships, F, r])
  const byK = new Map(before.map((x) => [x.k, x]))
  const [lo, hi] = bounds
  const pct = (t) => ((t - lo) / (hi - lo)) * 100
  const ticks = []
  const stepH = [1, 2, 3, 4, 6, 12].find((s) => (hi - lo) / s <= 8) ?? 24
  for (let t = Math.ceil(lo / stepH) * stepH; t <= hi + 1e-9; t += stepH) ticks.push(t)
  const chosen = step.cands.find((x) => x.status === 'chosen' || x.status === 'current')
  const bt = algo === 'bt'
  const cands = step.cands

  const verdict = (x) => {
    const ct = byK.get(x.k)
    if (x.status === 'blocked') {
      const u = ships[x.reason.ship]
      return {
        tone: 'bad', head: x.reason.t === 'time' ? 'Bị chặn · trùng giờ' : 'Bị chặn · ràng buộc phụ',
        sub: x.reason.t === 'time' ? `${u.name} cập bến ${toHM(u.s)}–${toHM(u.e)}, trùng với ${c.name}` : `${u.name} và ${c.name} không được chung hợp đồng`,
        tag: 'LOẠI',
      }
    }
    const formula = x.new ? `${fmtNum(F)} + ${fmtNum(r)} × ${fmtNum(c.e - c.s)}` : `${fmtNum(r)} × (${toHM(c.e)} − ${toHM(ct.e)})`
    const base = { formula, delta: x.delta, head: x.new ? 'Dùng được · mở hợp đồng mới' : `Dùng được · rảnh từ ${toHM(ct.e)}` }
    if (x.status === 'chosen' || x.status === 'current') return { ...base, tone: 'good', tag: x.status === 'chosen' ? 'CHỌN' : 'ĐANG THỬ' }
    if (x.status === 'pruned') return { ...base, tone: 'bad', tag: 'BỎ NHÁNH', sub: `cận ${money(x.bound)} ≥ tốt nhất hiện có ${money(step.best)}`, bound: x.bound }
    if (x.status === 'tried') return { ...base, tone: '', tag: 'ĐÃ THỬ' }
    if (x.status === 'pending') return { ...base, tone: '', tag: 'CHƯA XÉT' }
    const pricier = chosen && x.delta > chosen.delta + 1e-9
    return { ...base, tone: '', tag: pricier ? 'ĐẮT HƠN' : 'KHÔNG CHỌN', warn: pricier }
  }

  return (
    <section className="card">
      <div className="card-h">
        <span>Chọn hợp đồng cho {c.name} · mỗi dòng là một ứng viên</span>
        <small className="legend-i">
          <span><i className="ghost-sw" />chỗ thử đặt {c.name}</span>
          <span><i className="hatch-sw" />vùng trùng giờ</span>
        </small>
      </div>
      <div className="dec">
        <div className="dec-row dec-axis">
          <span />
          <div className="axis">{ticks.map((t) => <span key={t} className="tick" style={{ left: `${pct(t)}%` }}>{toHM(t)}</span>)}</div>
          <span className="dec-cap">KẾT LUẬN CHO ỨNG VIÊN</span>
        </div>
        {cands.map((x) => {
          const ct = byK.get(x.k)
          const v = verdict(x)
          const col = x.new ? '#6B7A8F' : colorOf(x.k)
          const ghostTone = x.status === 'blocked' || x.status === 'pruned' ? 'bad' : x.status === 'chosen' || x.status === 'current' ? 'good' : 'neu'
          const blocker = x.status === 'blocked' ? ships[x.reason.ship] : null
          const overlap = blocker && x.reason.t === 'time' ? [Math.max(c.s, blocker.s), Math.min(c.e, blocker.e)] : null
          return (
            <div key={x.k} className="dec-row dec-body">
              <div className="dec-name">
                <b>{x.new ? <i className="dot ring" /> : <i className="dot" style={{ background: col }} />}{x.new ? `HĐ${x.k + 1} mới` : `HĐ${x.k + 1}`}</b>
                <small>{x.new ? 'chưa có' : `đang thuê ${toHM(ct.s)}–${toHM(ct.e)}`}</small>
              </div>
              <div className="track">
                {!x.new && <span className="win" style={{ left: `${pct(ct.s)}%`, width: `${pct(ct.e) - pct(ct.s)}%`, background: tintOf(x.k), borderColor: col }} />}
                {!x.new && ct.ids.map((i) => (
                  <span key={i} className={`blk ${blocker && i === x.reason.ship ? (x.reason.t === 'extra' ? 'ring-x' : '') : ''}`}
                    style={{ left: `${pct(ships[i].s)}%`, width: `${pct(ships[i].e) - pct(ships[i].s)}%`, background: col }}>{ships[i].name.replace(/\D+/g, '')}</span>
                ))}
                {overlap && <span className="hatch" style={{ left: `${pct(overlap[0])}%`, width: `${pct(overlap[1]) - pct(overlap[0])}%` }} />}
                <span className={`blk ghost ${ghostTone}`} style={{ left: `${pct(c.s)}%`, width: `${pct(c.e) - pct(c.s)}%` }}>
                  {c.name.replace(/\D+/g, '')}
                  {ghostTone === 'good' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L19 7" /></svg>}
                  {ghostTone === 'bad' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>}
                </span>
              </div>
              <div className={`verdict ${v.tone}`}>
                <div className="v-t">
                  <span className="v-h">{v.head}</span>
                  {v.sub ? <small>{v.sub}</small> : v.formula ? <small className="mono">{v.formula}</small> : null}
                </div>
                {v.delta != null && <b className={`mono v-d ${v.tone}`}>+{money(v.delta)}</b>}
                <span className={`tag ${v.tone} ${v.warn ? 'warn' : ''}`}>{v.tag}</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ---------- Quay lui: chi phí tích lũy theo độ sâu so với phương án tốt nhất ---------- */
function pathCosts(ships, col, order, F, r) {
  const st = new Map()
  let total = 0
  const out = []
  for (const i of order) {
    if (col[i] < 0) break
    const k = col[i]
    const q = st.get(k)
    if (!q) { st.set(k, { s: ships[i].s, e: ships[i].e }); total += F + r * (ships[i].e - ships[i].s) }
    else {
      const ns = Math.min(q.s, ships[i].s), ne = Math.max(q.e, ships[i].e)
      total += r * ((ne - ns) - (q.e - q.s))
      q.s = ns; q.e = ne
    }
    out.push({ i, k, cost: total })
  }
  return out
}

function BtChart({ step, ships, order, F, r, lbCost }) {
  const path = useMemo(() => pathCosts(ships, step.col, order, F, r), [step, ships, order, F, r])
  const dead = step.kind === 'dead' ? step.cands.filter((x) => x.status === 'pruned' || x.status === 'tried') : []
  const W = 760, H = 290, L = 64, R = 170, T = 24, B = 28
  const win = path.slice(-5)
  const candCosts = dead.map((x) => x.bound)
  const all = [...win.map((p) => p.cost), ...candCosts, step.best ?? win.at(-1)?.cost ?? 0, lbCost]
  const lo = Math.min(...all), hi = Math.max(...all)
  const pad = Math.max(40, (hi - lo) * 0.12)
  const y0 = lo - pad, y1 = hi + pad
  const Y = (v) => H - B - ((v - y0) / (y1 - y0)) * (H - T - B)
  const slots = win.length + (dead.length ? 1 : 0)
  const X = (j) => L + (slots <= 1 ? 0 : (j * (W - L - R - 20)) / (slots - 1)) + 10
  const niceStep = [50, 100, 200, 250, 500, 1000, 2000, 5000].find((s) => (y1 - y0) / s <= 5) ?? 10000
  const gridV = []
  for (let v = Math.ceil(y0 / niceStep) * niceStep; v <= y1; v += niceStep) gridV.push(v)
  // nhãn ứng viên: giãn cách tối thiểu 15px theo chiều dọc
  const labelY = {}
  let prevY = -1e9
  ;[...dead].sort((a, b) => Y(a.bound) - Y(b.bound)).forEach((x) => { const y = Math.max(Y(x.bound), prevY + 15); labelY[x.k] = y; prevY = y })
  const last = win.at(-1)
  return (
    <section className="card">
      <div className="card-h"><span>Chi phí theo độ sâu so với phương án tốt nhất</span><small>{win.length ? `từ ${ships[win[0].i].name} đến ${ships[win.at(-1).i].name}${dead.length ? ` → ${ships[step.cur].name}` : ''}` : ''}</small></div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} role="img" aria-label="Chi phí tích lũy theo độ sâu và đường phương án tốt nhất hiện có">
        {gridV.map((v, q) => (
          <g key={q}><line x1={L} y1={Y(v)} x2={W - R} y2={Y(v)} stroke="#EEF1F5" />
            <text x={L - 8} y={Y(v) + 3} textAnchor="end" fontSize="10" fill="#8B98A3" fontFamily="JetBrains Mono, monospace">{fmtNum(Math.round(v))}</text></g>
        ))}
        {step.best != null && <>
          <line x1={L} y1={Y(step.best)} x2={W - R} y2={Y(step.best)} stroke="#1E8E5A" strokeWidth="2" strokeDasharray="7 5" />
          <text x={L + 8} y={Y(step.best) - 7} fontSize="11" fontWeight="700" fill="#1E8E5A">Phương án tốt nhất hiện có: {fmtNum(step.best)}</text>
        </>}
        {lbCost !== step.best && <>
          <line x1={L} y1={Y(lbCost)} x2={W - R} y2={Y(lbCost)} stroke="#5AA7AD" strokeWidth="1.5" strokeDasharray="2 4" />
          <text x={L + 8} y={Y(lbCost) + 14} fontSize="10" fill="#5AA7AD" fontFamily="JetBrains Mono, monospace">cận dưới {fmtNum(lbCost)} (thấp nhất có thể)</text>
        </>}
        {win.length > 1 && <polyline points={win.map((p, j) => `${X(j)},${Y(p.cost)}`).join(' ')} fill="none" stroke="#024D71" strokeWidth="3" strokeLinejoin="round" />}
        {win.map((p, j) => (
          <g key={p.i}><circle cx={X(j)} cy={Y(p.cost)} r={j === win.length - 1 ? 6 : 5} fill="#024D71" />
            <text x={X(j)} y={Y(p.cost) + 20} fontSize="11" fill="#024D71" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontWeight={j === win.length - 1 ? 700 : 400}>{fmtNum(p.cost)}</text>
            <text x={X(j)} y={H - 8} fontSize="10" fill="#8B98A3" textAnchor="middle">{ships[p.i].name}</text></g>
        ))}
        {dead.map((x, q) => (
          <g key={x.k}>
            <line x1={X(win.length - 1)} y1={Y(last.cost)} x2={X(win.length)} y2={Y(x.bound)} stroke="#C53030" strokeWidth="2" strokeDasharray="5 4" />
            <path d={`M${X(win.length) - 5} ${Y(x.bound) - 5}l10 10M${X(win.length) + 5} ${Y(x.bound) - 5}l-10 10`} stroke="#C53030" strokeWidth="3" strokeLinecap="round" />
            <text x={X(win.length) + 14} y={labelY[x.k] + 4} fontSize="11" fontWeight="700" fill="#C53030" fontFamily="JetBrains Mono, monospace">{fmtNum(x.bound)}  (+{fmtNum(x.bound - step.best)})</text>
          </g>
        ))}
        {dead.length > 0 && <text x={X(win.length)} y={H - 8} fontSize="10" fill="#C53030" textAnchor="middle" fontWeight="700">{ships[step.cur].name}</text>}
        {win.length === 0 && <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="12" fill="#8B98A3">Chưa gán tàu nào</text>}
      </svg>
    </section>
  )
}

function PathChain({ step, ships, order, F, r }) {
  const path = useMemo(() => pathCosts(ships, step.col, order, F, r), [step, ships, order, F, r])
  const dead = step.kind === 'dead' && step.cur >= 0
  if (!path.length && !dead) return null
  return (
    <section className="card">
      <div className="card-h"><span>Đường đi hiện tại trong cây tìm kiếm</span><small>mỗi nút: tàu → hợp đồng, kèm tổng chi phí tích lũy</small></div>
      <div className="chain">
        {path.map((p, j) => (
          <React.Fragment key={p.i}>
            {j > 0 && <i className="link" />}
            <div className="node"><span style={{ background: colorOf(p.k) }}>{ships[p.i].name.replace(/\D+/g, '')}</span><b>HĐ{p.k + 1}</b><small className="mono">{fmtNum(p.cost)}</small></div>
          </React.Fragment>
        ))}
        {dead && <>
          <i className="link bad" />
          <div className="node bad"><span className="x">{ships[step.cur].name.replace(/\D+/g, '')}</span><b>bỏ nhánh</b><small className="mono">≥ {fmtNum(Math.min(...step.cands.filter((x) => x.bound != null).map((x) => x.bound)))}</small></div>
        </>}
      </div>
    </section>
  )
}

/* ---------- Dải các bước ---------- */
const KIND_COLOR = { info: '#D8DDE5', assign: '#009AA5', back: '#E5B26B', found: '#1E8E5A', dead: '#C53030', done: '#1E8E5A' }

function Strip({ algo, steps, idx, setStep, ships }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current?.querySelector('[data-cur="1"]')
    if (el && ref.current && ref.current.scrollWidth > ref.current.clientWidth) el.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [idx])
  if (algo === 'bt') {
    return (
      <section className="card">
        <div className="card-h"><span>Nhịp tìm kiếm</span>
          <small className="legend-i">
            {[['assign', 'thử gán'], ['back', 'quay lui (lùi lại)'], ['dead', 'bỏ nhánh'], ['found', 'phương án tốt nhất / hoàn tất']].map(([k, l]) => (
              <span key={k}><i className="sq" style={{ background: KIND_COLOR[k] }} />{l}</span>))}
          </small>
        </div>
        <div className="pad">
          <div className="trace">
            {steps.map((s, i) => (
              <button type="button" key={i} aria-label={`Bước ${i}`} title={`${i}: ${KIND_TITLE[s.kind]}`} onClick={() => setStep(i)}
                className={i === idx ? 'cur' : ''} style={{ background: KIND_COLOR[s.kind], opacity: i > idx ? 0.35 : 1 }} />
            ))}
          </div>
          <div className="trace-l"><span>0</span><span style={{ color: 'var(--ink-muted)' }}>bước {idx}/{steps.length - 1}</span><span>{steps.length - 1} · hoàn tất</span></div>
          <p className="hint">Mỗi ô là một bước của thuật toán. Dải này cho thấy nhịp tìm kiếm: đi sâu, gặp phương án tốt nhất, lùi lại, thử nhánh khác. Bấm một ô để nhảy tới bước đó.</p>
        </div>
      </section>
    )
  }
  return (
    <section className="card">
      <div className="card-h"><span>Các bước</span><small>bấm một ô để nhảy tới bước đó</small></div>
      <div className="pad">
        <div className="film" ref={ref}>
          {steps.map((s, i) => {
            const c = s.cur >= 0 ? ships[s.cur] : null
            const k = s.row
            const ch = s.cands?.find((x) => x.status === 'chosen')
            const future = i > idx
            return (
              <button type="button" key={i} data-cur={i === idx ? 1 : 0} onClick={() => setStep(i)} className={`cell ${i === idx ? 'cur' : ''} ${future ? 'fut' : ''}`}>
                <small className="mono">{i}</small>
                {c ? <span className="chip-n" style={{ background: future ? '#C3CBD6' : colorOf(k), color: future ? '#5C6B78' : '#fff' }}>{c.name.replace(/\D+/g, '')}</span>
                  : <span className="chip-n ring">{s.kind === 'done' ? '✓' : ''}</span>}
                <small>{c ? (future ? 'chờ' : ch ? (ch.new ? `mở HĐ${ch.k + 1}` : `HĐ${ch.k + 1} +${money(ch.delta)}`) : `HĐ${k + 1}`) : s.kind === 'done' ? 'Hoàn tất' : 'Bắt đầu'}</small>
                <b className="mono">{future && s.kind !== 'info' ? '–' : money(s.cost)}</b>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default function StepView({ algo, steps, step, setStep, ships, F, r, lbCost }) {
  const idx = Math.min(step, steps.length - 1)
  const s = steps[idx]
  const order = useMemo(() => ships.map((_, i) => i).sort((a, b) => ships[a].s - ships[b].s || ships[a].e - ships[b].e || a - b), [ships])
  const bounds = useMemo(() => [Math.floor(Math.min(...ships.map((x) => x.s))), Math.ceil(Math.max(...ships.map((x) => x.e)))], [ships])
  const hasCands = s.cands && s.cur >= 0
  return (
    <div className="stepview" data-testid="stepview">
      <div className="sv-left">
        <Pseudo algo={algo} line={s.line} />
        <Vars algo={algo} step={s} ships={ships} n={ships.length} lbCost={lbCost} pos={s.cur >= 0 ? order.indexOf(s.cur) + 1 : 0} />
      </div>
      <div className="sv-main">
        <Band algo={algo} step={s} idx={idx} total={steps.length - 1} ships={ships} steps={steps} />
        {hasCands && <Decision algo={algo} step={s} ships={ships} F={F} r={r} bounds={bounds} />}
        {algo === 'bt' && <PathChain step={s} ships={ships} order={order} F={F} r={r} />}
        {algo === 'bt' && s.kind !== 'info' && <BtChart step={s} ships={ships} order={order} F={F} r={r} lbCost={lbCost} />}
        {!hasCands && algo !== 'bt' && <div className="empty">{s.msg}</div>}
        <Strip algo={algo} steps={steps} idx={idx} setStep={setStep} ships={ships} />
      </div>
    </div>
  )
}
