import React, { useEffect, useState } from 'react'
import { toHM, parseHM, fmtNum } from './util.js'

export const Icon = ({ d, size = 16, sw = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
)
export const I = {
  anchor: <><circle cx="12" cy="5" r="2" /><path d="M12 7v13" /><path d="M5 12H2a10 10 0 0020 0h-3" /><path d="M5 12a7 7 0 0014 0" /></>,
  prev: <path d="M15 6l-6 6 6 6" />,
  next: <path d="M9 6l6 6-6 6" />,
  play: <path d="M7 5l12 7-12 7z" fill="currentColor" />,
  pause: <><rect x="7" y="5" width="4" height="14" fill="currentColor" /><rect x="13" y="5" width="4" height="14" fill="currentColor" /></>,
  first: <><path d="M18 5L8 12l10 7z" fill="currentColor" /><path d="M5 5v14" /></>,
  last: <><path d="M6 5l10 7-10 7z" fill="currentColor" /><path d="M19 5v14" /></>,
  dice: <><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="9" cy="9" r=".8" fill="currentColor" /><circle cx="15" cy="15" r=".8" fill="currentColor" /><circle cx="15" cy="9" r=".8" fill="currentColor" /><circle cx="9" cy="15" r=".8" fill="currentColor" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12l5 5L19 7" />,
}


/* ---- Phát từng bước: dùng chung cho các module ---- */
export function usePlayer(steps, startAtEnd = true) {
  const [step, setStepRaw] = useState(0)
  const [playing, setPlaying] = useState(false)
  const last = Math.max(0, steps.length - 1)
  useEffect(() => {
    if (!playing) return
    if (step >= last) { setPlaying(false); return }
    const id = setTimeout(() => setStepRaw((s) => s + 1), 650)
    return () => clearTimeout(id)
  }, [playing, step, last])
  const setStep = (i) => { setPlaying(false); setStepRaw(Math.max(0, Math.min(last, i))) }
  const jumpEnd = () => { setPlaying(false); setStepRaw(last) }
  return { step: Math.min(step, last), last, playing, setPlaying, setStep, jumpEnd, startAtEnd }
}

export function Controls({ p, extra }) {
  return (
    <div className="ctl">
      <span className="lab" data-testid="step-label">Bước {p.step}/{p.last}</span>
      <button className="iconbtn" aria-label="Về đầu" onClick={() => p.setStep(0)}><Icon d={I.first} size={14} /></button>
      <button className="iconbtn" aria-label="Bước trước" onClick={() => p.setStep(p.step - 1)} data-testid="prev"><Icon d={I.prev} size={14} /></button>
      <button className="iconbtn fill" aria-label={p.playing ? 'Tạm dừng' : 'Phát'} data-testid="play"
        onClick={() => { if (!p.playing && p.step >= p.last) p.setStep(0); p.setPlaying(!p.playing) }}><Icon d={p.playing ? I.pause : I.play} size={14} /></button>
      <button className="iconbtn" aria-label="Bước tiếp" onClick={() => p.setStep(p.step + 1)} data-testid="next"><Icon d={I.next} size={14} /></button>
      <button className="iconbtn" aria-label="Về cuối" onClick={() => p.setStep(p.last)}><Icon d={I.last} size={14} /></button>
      {extra}
      <input type="range" min="0" max={p.last} value={p.step} onChange={(e) => p.setStep(Number(e.target.value))} />
    </div>
  )
}

/* ---- Mã giả: lines = [[thụt, text], ...]; cur/ran = Set số dòng (đánh số từ 1) ---- */
export function Code({ lines, cur = new Set(), ran = new Set(), title = 'Mã giả' }) {
  return (
    <section className="card">
      <div className="card-h"><span>{title}</span><small>dòng đang chạy được tô màu</small></div>
      <div className="code">
        {lines.map(([ind, txt], i) => {
          const n = i + 1
          const cls = cur.has(n) ? 'cur' : ran.has(n) ? 'ran' : ''
          return <div key={n} className={`cl ${cls}`}><span className="ln">{n}</span><span style={{ paddingLeft: ind * 14 }}>{txt}</span></div>
        })}
      </div>
      <div className="card-f"><span><i className="sw ran" />đã chạy</span><span><i className="sw cur" />đang chạy</span></div>
    </section>
  )
}

export function VarsCard({ rows }) {
  return (
    <section className="card">
      <div className="card-h"><span>Biến hiện tại</span></div>
      <div className="vars">{rows.map(([k, v, tone]) => <div key={k} className={`vr ${tone || ''}`}><span>{k}</span><b className="mono">{v}</b></div>)}</div>
    </section>
  )
}

export const KIND_TITLE = { info: 'GIỚI THIỆU', assign: 'GÁN', place: 'XẾP', take: 'LẤY', skip: 'BỎ QUA', cell: 'ĐIỀN Ô', trace: 'TRUY VẾT', back: 'QUAY LUI', found: 'TỐT NHẤT HIỆN CÓ', dead: 'BỎ NHÁNH', prune: 'BỎ NHÁNH', fail: 'KHÔNG GÁN ĐƯỢC', done: 'HOÀN TẤT' }

export function Band({ step, idx, last, kpis }) {
  const tone = step.kind === 'dead' || step.kind === 'prune' || step.kind === 'fail' ? 'bad' : step.kind === 'found' || step.kind === 'done' ? 'good' : ''
  return (
    <div className={`band ${tone}`} data-testid="band">
      <div className="band-n">{idx}</div>
      <div className="band-t">
        <div className="band-k"><b>{KIND_TITLE[step.kind] || step.kind}</b><span>bước {idx}/{last}</span></div>
        <div className="band-h">{step.msg}</div>
      </div>
      <div className="band-r">{kpis.map(([k, v]) => <div key={k}><small>{k}</small><b className="mono">{v}</b></div>)}</div>
    </div>
  )
}

/* ---- Dải các bước (quay lui): mỗi ô là một bước, tô màu theo loại ---- */
const KC = { info: '#D8DDE5', assign: '#009AA5', place: '#009AA5', take: '#009AA5', skip: '#C3CBD6', back: '#E5B26B', found: '#1E8E5A', dead: '#C53030', prune: '#C53030', fail: '#C53030', done: '#1E8E5A', cell: '#009AA5', trace: '#8A4FC9' }
export function Trace({ steps, idx, setStep }) {
  const max = 160
  const pick = steps.length <= max ? steps.map((_, i) => i) : Array.from({ length: max }, (_, k) => Math.round((k * (steps.length - 1)) / (max - 1)))
  return (
    <section className="card">
      <div className="card-h"><span>Dải các bước</span><small>bấm để nhảy tới bước đó</small></div>
      <div className="pad">
        <div className="trace">
          {pick.map((i) => <button key={i} title={`Bước ${i}: ${steps[i].msg}`} className={i === idx || (pick.indexOf(i) < pick.length - 1 && idx > i && idx < pick[pick.indexOf(i) + 1]) ? 'cur' : ''}
            style={{ background: KC[steps[i].kind] || '#D8DDE5' }} onClick={() => setStep(i)} />)}
        </div>
        <div className="trace-l"><span>0</span><span>{steps.length - 1}</span></div>
        <div className="legend-i hint" style={{ marginTop: 8 }}>
          <span><i className="sq" style={{ background: '#009AA5' }} />thử</span><span><i className="sq" style={{ background: '#E5B26B' }} />quay lui</span>
          <span><i className="sq" style={{ background: '#C53030' }} />bỏ nhánh</span><span><i className="sq" style={{ background: '#1E8E5A' }} />tốt nhất hiện có / xong</span>
        </div>
      </div>
    </section>
  )
}

/* ---- Biểu đồ cận: cận (hoặc tổng tạm) theo từng bước + đường tốt nhất hiện có + cận dưới ---- */
export function BoundChart({ steps, idx, lb, valKey = 'bound', minimize = true, label, sub }) {
  const pts = steps.map((s, i) => ({ i, v: s[valKey], best: s.best })).filter((p) => typeof p.v === 'number')
  if (pts.length < 2) return null
  const W = 640, H = 200, L = 52, R = 76, T = 14, B = 26
  const vals = [...pts.map((p) => p.v), ...pts.filter((p) => p.best != null).map((p) => p.best), ...(lb != null ? [lb] : [])]
  let lo = Math.min(...vals), hi = Math.max(...vals)
  if (hi === lo) { hi += 1; lo -= 1 }
  const allInt = vals.every((v) => Number.isInteger(v)), nonNeg = vals.every((v) => v >= 0)
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad
  if (nonNeg && lo < 0) lo = 0
  const x = (i) => L + (i / Math.max(1, steps.length - 1)) * (W - L - R)
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  const line = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join('')
  const bestPts = pts.filter((p) => p.best != null)
  const bestLine = bestPts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.best).toFixed(1)}`).join('')
  const cur = pts.filter((p) => p.i <= idx).pop()
  const fmt = (v) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: allInt || hi - lo > 20 ? 0 : 1 }).format(v)
  const ticks = [0, 1, 2, 3].map((k) => { const t = lo + ((hi - lo) * k) / 3; return allInt || hi - lo > 20 ? Math.round(t) : t })
  return (
    <section className="card">
      <div className="card-h"><span>{label || 'Cận theo từng bước'}</span><small>{sub || (minimize ? 'đường xám là cận ở từng bước; bỏ nhánh khi cận không tốt hơn đường xanh' : 'đường xám là cận trên; bỏ nhánh khi cận không vượt đường xanh')}</small></div>
      <div className="pad">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Biểu đồ cận">
          {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#E4E8EE" /><text x={L - 6} y={y(t)} textAnchor="end" dominantBaseline="central" fontSize="10" fill="#6F7C88" fontFamily="JetBrains Mono, monospace">{fmt(t)}</text></g>)}
          {lb != null && <><line x1={L} x2={W - R} y1={y(lb)} y2={y(lb)} stroke="#9C4221" strokeDasharray="5 4" /><text x={W - R + 6} y={y(lb)} dominantBaseline="central" fontSize="10" fill="#9C4221">cận dưới {fmt(lb)}</text></>}
          <path d={line} fill="none" stroke="#9AA7B2" strokeWidth="1.5" />
          {bestLine && <path d={bestLine} fill="none" stroke="#1E8E5A" strokeWidth="2.2" />}
          {cur && <circle cx={x(cur.i)} cy={y(cur.v)} r="5" fill="#BD0F72" stroke="#fff" strokeWidth="2" />}
          <text x={L} y={H - 6} fontSize="10" fill="#6F7C88">bước 0</text><text x={W - R} y={H - 6} textAnchor="end" fontSize="10" fill="#6F7C88">bước {steps.length - 1}</text>
        </svg>
      </div>
    </section>
  )
}

export const verdictClass = { chosen: 'pick', ok: 'ok', blocked: 'no', pruned: 'no', tried: 'pend', pending: 'pend', new: 'pend' }
export function Verdict({ status, children }) {
  const lab = { chosen: 'CHỌN', ok: 'KHẢ THI', blocked: 'LOẠI', pruned: 'BỎ NHÁNH', tried: 'ĐÃ THỬ', new: 'TÀU MỚI' }[status] || status
  return <span className={`v ${verdictClass[status] || 'pend'}`}>{children || lab}</span>
}

export function ModuleError({ error }) { return error ? <div className="err">{error}</div> : null }

export function TimeInput({ value, onCommit }) {
  const [txt, setTxt] = useState(toHM(value))
  const [bad, setBad] = useState(false)
  useEffect(() => { setTxt(toHM(value)); setBad(false) }, [value])
  const commit = () => {
    const v = parseHM(txt.trim())
    if (isNaN(v) || v < 0 || v > 24) { setBad(true); return }
    setBad(false); onCommit(v)
  }
  return <input className={`tin ${bad ? 'bad' : ''}`} value={txt} maxLength={5} aria-label="Giờ HH:MM" placeholder="HH:MM"
    onChange={(e) => setTxt(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
}

export function CompareTable({ rows, note, onPick, active }) {
  const best = Math.min(...rows.map((r) => r.rank))
  return (
    <>
      <div className="cmpwrap">
        <table className="cmp" data-testid="compare">
          <thead><tr><th>Thuật toán</th><th>{rows[0].head}</th><th>So với cận</th><th>Số bước</th><th>Thời gian</th></tr></thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.key} className={`${active === x.key ? 'sel' : ''} ${x.rank === best ? 'win' : ''}`} onClick={() => onPick(x.key)}>
                <td>{x.name}{x.tag && <span className={`tag ${x.tag.ok ? 'ok' : 'no'}`}>{x.tag.text}</span>}</td>
                <td>{x.valueText}</td><td>{x.gap}</td><td>{x.steps}</td>
                <td>{x.ms < 1 ? '<1' : fmtNum(x.ms)} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="note"><span>{note}</span></div>
    </>
  )
}
