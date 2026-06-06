# Quy trình cộng tác 2 AI (Reasonix coder + agy reviewer) — rút từ thí nghiệm 2026-06-06

> Mục đích: lần sau giao agy + Reasonix tự phối hợp qua kênh file, dùng quy trình
> này để CHỐNG các điểm mù đã phát hiện. Áp cho mọi task delegate 2 AI.

## Kết quả thí nghiệm gốc (vì sao có guide này)
2 AI tự làm 3 việc (xe/máy, minStock, NCC) đạt ~85%. Phối hợp giao thức TỐT.
Nhưng BỎ SÓT 1 lỗi thật: thêm cột DB + form + action LƯU đúng, nhưng QUÊN cập nhật
QUERY ĐỌC (getSuppliers thiếu select) → cột mới luôn trống trên UI. tsc/build/
self-report đều xanh; chỉ verify render thật mới bắt. agy không bắt vì chỉ soi
git diff của commit → file query không bị commit đụng = ngoài tầm.

## 3 GUARD BẮT BUỘC (thêm vào kênh AI-CHANNEL.md mỗi lần)

### GUARD 1 — Reviewer soi LUỒNG DỮ LIỆU end-to-end, KHÔNG chỉ git diff
Khi thêm/sửa 1 trường dữ liệu, reviewer phải kiểm ĐỦ CHUỖI:
`schema → migration → validation → action GHI → query ĐỌC → component nhận prop → UI render`.
Hỏi: "Trường mới này có được QUERY ĐỌC lấy ra (select) và CHẢY tới UI không?"
→ Đặc biệt: mỗi field mới PHẢI grep tên field trong lib/queries/ để chắc query đọc lấy nó.
KHÔNG được chỉ review diff của commit — phải mở rộng ra file LIÊN QUAN dù không bị commit đụng.

### GUARD 2 — Coder tự liệt kê "checklist luồng" khi thêm field
Trong khối CHỜ REVIEW, coder phải ghi 1 dòng cho MỖI tầng đã đụng:
"schema ✓ / migration ✓ / validation ✓ / action ghi ✓ / QUERY ĐỌC ✓ / UI ✓".
Nếu 1 tầng KHÔNG cần đụng, ghi rõ "không cần vì ...". Bỏ trống 1 tầng = cờ đỏ.

### GUARD 3 — Tiêu chí XONG phải gồm VERIFY RENDER THẬT (không chỉ tsc/build)
tsc 0 lỗi + build pass KHÔNG đủ (props optional che lỗi data-không-tới-UI).
Bắt buộc: seed 1 bản ghi có trường mới → render trang thật (curl/playwright authed)
→ xác nhận GIÁ TRỊ trường mới HIỆN trên HTML. "build pass ≠ chạy được."

## MẪU KÊNH chuẩn (copy vào AI-CHANNEL.md phần RÀNG BUỘC + TIÊU CHÍ)
- RÀNG BUỘC thêm: "Mỗi field mới: kiểm ĐỦ chuỗi schema→migration→validation→action
  ghi→QUERY ĐỌC→UI. Coder ghi checklist-luồng. Reviewer grep field trong lib/queries/."
- TIÊU CHÍ XONG thêm: "Verify RENDER THẬT: seed data có field mới → render trang
  authed → field hiện trên HTML (KHÔNG chỉ tsc/build)."

## Phân vai vẫn giữ
- Reasonix(flash) = coder: mạnh, code phần khó (migration/raw SQL) chuẩn ngay.
- agy = reviewer: nghiêm về diff, nhưng PHẢI áp Guard 1 (soi ngoài diff).
- Claude = setup kênh + thúc-nhịp + VERIFY CUỐI (lớp render-thật độc lập, không bỏ).
