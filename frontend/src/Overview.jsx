import React from 'react'

const CARDS = [
  { k: 'berth', n: 'Module 1 · Thuê bến', status: 'ĐÃ XONG', q: 'Thuê bao nhiêu hợp đồng bến, tàu nào chung hợp đồng?',
    d: 'Chi phí hợp đồng = phí cố định + đơn giá × số giờ thuê, tính cả giờ chờ giữa hai tàu.', m: 'Tô màu đồ thị khoảng. Một màu là một hợp đồng.', a: ['Tham lam', 'Best-fit', 'DSatur', 'Quay lui'] },
  { k: 'assign', n: 'Module 2 · Phân công đội', status: 'MỚI', q: 'Đội nào phục vụ tàu nào để tổng chi phí nhỏ nhất?',
    d: 'Mỗi lượt tàu cần một đội đủ kỹ năng (bốc dỡ, container lạnh...). Một đội không phục vụ hai tàu trùng giờ.', m: 'Gán việc có ràng buộc. Xung đột = trùng giờ, lấy từ module 1.', a: ['Tham lam theo giờ đến', 'Tham lam tàu khó trước', 'Quay lui + nhánh cận'] },
  { k: 'knap', n: 'Module 3 · Quỹ giờ công', status: 'MỚI', q: 'Còn 8 giờ công tăng ca, nhận những yêu cầu nào?',
    d: 'Mỗi yêu cầu thêm (sửa cẩu, tiếp nhiên liệu...) tốn giờ công và mang lại giá trị. Chọn tập có tổng giá trị lớn nhất.', m: 'Bài toán cái túi 0/1. Ca mẫu: tham lam ra 100, quy hoạch động ra 110.', a: ['Tham lam giá trị/giờ', 'Quy hoạch động', 'Quay lui + nhánh cận'] },
  { k: 'bins', n: 'Module 4 · Xếp container', status: 'MỚI', q: 'Cần ít nhất bao nhiêu tàu để chở hết các lô container?',
    d: 'Mỗi lô nặng một số tấn, mỗi tàu chịu tối đa 30 tấn. Cận dưới = tổng tải chia tải trọng, làm tròn lên.', m: 'Bài toán đóng thùng (bin packing).', a: ['First-fit', 'First-fit giảm dần', 'Best-fit giảm dần', 'Quay lui + nhánh cận'] },
]
const COVER = [
  ['Mô hình hóa theo 6 bước, cận dưới', '●●●●'], ['Tham lam', '●●●●'], ['Quay lui (chương 4)', '●●●●'], ['Nhánh cận (bỏ nhánh khi vượt cận)', '●●●●'],
  ['Quy hoạch động', '––●–'], ['Chia để trị, quy hoạch tuyến tính', '––––'],
]

export default function Overview({ go }) {
  return (
    <main className="ov">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 760 }}>
        <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.25, color: 'var(--teal-900)' }}>Một hệ thống, bốn bài toán: từ thuê bến đến xếp hàng lên tàu</h2>
        <p className="hint" style={{ fontSize: 14, margin: 0 }}>Mỗi module có cùng một khung: chọn thuật toán bên trái, xem từng bước bên phải (mã giả, bảng ứng viên, kết luận từng bước). Module 2 lấy dữ liệu tàu từ module 1.</p>
      </div>
      <div className="note" style={{ gap: 14, flexWrap: 'wrap' }}>
        <b style={{ color: 'var(--teal-900)', letterSpacing: '.06em', fontSize: 12 }}>LUỒNG DỮ LIỆU</b>
        <span className="v" style={{ background: 'var(--teal-900)', color: '#fff' }}>1 Thuê bến</span><span>khung giờ mỗi tàu ở bến, đồ thị xung đột</span><span aria-hidden="true">→</span>
        <span className="v pick">2 Phân công đội</span><span style={{ marginLeft: 'auto' }}>Module 3 và 4 độc lập, dùng chung giao diện và bộ máy chạy từng bước.</span>
      </div>
      <div className="ov-grid">
        {CARDS.map((c) => (
          <section key={c.k} className="card ov-card" style={c.status === 'MỚI' ? { borderColor: 'var(--magenta)' } : undefined}>
            <div className="card-h"><span>{c.n}</span><span className={`v ${c.status === 'MỚI' ? 'pick' : 'ok'}`}>{c.status}</span></div>
            <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{c.q}</p>
              <p className="hint" style={{ margin: 0 }}>{c.d}</p>
              <div><div className="hint"><b>Mô hình</b></div><p style={{ margin: 0, fontSize: 13 }}>{c.m}</p></div>
              <div className="chips">{c.a.map((x) => <span key={x} className="chip" style={{ padding: '3px 10px' }}>{x}</span>)}</div>
              <button className="btn sm" onClick={() => go(c.k)} data-testid={`open-${c.k}`}>Mở module</button>
            </div>
          </section>
        ))}
      </div>
      <section className="card">
        <div className="card-h"><span>Phủ chương trình học</span><small>dùng cho phần "Mô hình" và "Kết luận" của báo cáo</small></div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Nội dung trong chương trình</th><th>M1</th><th>M2</th><th>M3</th><th>M4</th></tr></thead>
            <tbody>{COVER.map(([t, m]) => <tr key={t}><td>{t}</td>{[...m].map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <div className="pad"><p className="hint" style={{ margin: 0 }}>Dòng cuối chưa có bài nào dùng.</p></div>
      </section>
    </main>
  )
}
