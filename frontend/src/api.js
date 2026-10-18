async function post(path, payload) {
  let res
  try {
    res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  } catch {
    throw new Error('Không kết nối được backend (cổng 8000). Hãy chạy: uvicorn server:app --port 8000')
  }
  if (!res.ok) {
    let d = ''
    try { d = (await res.json()).detail } catch { /* ignore */ }
    throw new Error(typeof d === 'string' && d ? d : `Lỗi backend (${res.status})`)
  }
  return res.json()
}

export const solve = (p) => post('/api/solve', p)
export const solveAssign = (p) => post('/api/assign', p)
export const solveKnap = (p) => post('/api/knapsack', p)
export const solveBins = (p) => post('/api/binpack', p)
