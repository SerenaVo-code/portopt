export const ALGOS = [
  { key: 'greedy', name: 'Tham lam theo giờ đến', desc: 'Duyệt tàu theo thứ tự đến, gán hợp đồng còn trống sớm nhất.' },
  { key: 'best', name: 'Tham lam chọn hợp đồng rẻ nhất', desc: 'Ở mỗi bước, chọn hợp đồng khiến tổng chi phí tăng ít nhất.' },
  { key: 'dsatur', name: 'DSatur', desc: 'Ưu tiên tàu có nhiều xung đột với tàu đã xếp nhất.' },
  { key: 'bt', name: 'Quay lui', desc: 'Thử mọi cách gán có cắt tỉa, tối ưu chi phí nhưng chậm hơn.' },
]

export const CONTRACT_COLORS = ['#009AA5', '#8A4FC9', '#C9801E', '#D1366F', '#3E7CB1', '#5B9A2F', '#A0522D', '#6B7A8F']
export const TINTS = ['#E3F4F5', '#F1E8FA', '#FBEDDA', '#FBE6EE', '#E4EEF7', '#E8F3DE', '#F3E7E0', '#EAEDF1']
export const colorOf = (k) => CONTRACT_COLORS[k % CONTRACT_COLORS.length]
export const tintOf = (k) => TINTS[k % TINTS.length]

export const toHM = (v) => {
  const t = Math.round(v * 60)
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}
export const parseHM = (s) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s || '')
  return m ? Number(m[1]) + Number(m[2]) / 60 : NaN
}
export const fmtNum = (v) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(v)

export const SAMPLES = [
  {
    id: 'ui', label: 'Mẫu 7 tàu', F: 500, r: 40, pairs: [[1, 4]],
    ships: [[6, 9], [8, 11], [9.5, 13], [10, 14], [13.5, 17], [15, 19], [18, 21]],
  },
  {
    id: 'diff', label: 'Mẫu 4 thuật toán cho 4 kết quả', F: 500, r: 40, pairs: [[0, 5], [6, 0]],
    ships: [[17.5, 21.5], [10, 15.5], [18.5, 22.5], [13.5, 17], [14.5, 18.5], [6, 10.5], [16, 20.5], [11, 13.5]],
  },
]
export const sampleShips = (sm) => sm.ships.map(([s, e], i) => ({ name: `Tàu ${i + 1}`, s, e }))

export function randomShips(n = 8) {
  const out = []
  for (let i = 0; i < n; i++) {
    const s = 6 + Math.floor(Math.random() * 24) / 2
    out.push({ name: `Tàu ${i + 1}`, s, e: Math.min(23.5, s + 2 + Math.floor(Math.random() * 8) / 2) })
  }
  return out
}

// "2-5, 1-7" -> [[1,4],[0,6]]; trả về {pairs} hoặc {error}
export function parsePairs(text, n) {
  const out = []
  for (const part of text.split(/[,;\s]+/).filter(Boolean)) {
    const m = /^(\d+)\s*[-–]\s*(\d+)$/.exec(part)
    if (!m) return { error: `"${part}" không đúng dạng 2-5` }
    const a = Number(m[1]), b = Number(m[2])
    if (a < 1 || b < 1 || a > n || b > n) return { error: `Tàu ${a}-${b}: số tàu phải từ 1 đến ${n}` }
    if (a === b) return { error: 'Hai tàu phải khác nhau' }
    out.push([a - 1, b - 1])
  }
  return { pairs: out }
}

export const hasPair = (pairs, a, b) => pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))

export function contractsOf(ships, col, F, r) {
  const map = new Map()
  col.forEach((k, i) => {
    if (k < 0) return
    if (!map.has(k)) map.set(k, { k, ids: [], s: Infinity, e: -Infinity })
    const c = map.get(k)
    c.ids.push(i)
    c.s = Math.min(c.s, ships[i].s)
    c.e = Math.max(c.e, ships[i].e)
  })
  const list = [...map.values()].sort((a, b) => a.k - b.k)
  list.forEach((c) => { c.hours = c.e - c.s; c.cost = F + r * c.hours; c.busy = c.ids.reduce((t, i) => t + ships[i].e - ships[i].s, 0) })
  return list
}
