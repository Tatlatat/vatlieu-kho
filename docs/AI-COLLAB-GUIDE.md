# Quy trình cộng tác nhiều model (`vatlieu-kho`)

> Mục đích: để nhiều model cùng làm việc trên `vatlieu-kho` mà không bị lệch
> nghiệp vụ, lệch quyền, hoặc lệch hạ tầng. Tài liệu này áp cho mọi workflow
> multi-model, không chỉ cặp `Reasonix + agy`.

## Điểm vào bắt buộc

Trước khi giao việc cho model khác, model điều phối PHẢI gửi/đính kèm ít nhất:

- `docs/COLLAB-SOURCE-OF-TRUTH.md`
- `AGENTS.md`
- file code nguồn sự thật của task đang làm

Không được chỉ đưa spec cũ hoặc plan cũ rồi để model tự suy.

## Kết quả thí nghiệm gốc (vì sao có guide này)
2 AI tự làm 3 việc (xe/máy, minStock, NCC) đạt ~85%. Phối hợp giao thức TỐT.
Nhưng BỎ SÓT 1 lỗi thật: thêm cột DB + form + action LƯU đúng, nhưng QUÊN cập nhật
QUERY ĐỌC (getSuppliers thiếu select) → cột mới luôn trống trên UI. tsc/build/
self-report đều xanh; chỉ verify render thật mới bắt. agy không bắt vì chỉ soi
git diff của commit → file query không bị commit đụng = ngoài tầm.

## 5 guard bắt buộc

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

### GUARD 4 — Quyền và menu phải đọc từ code hiện tại, không đọc từ docs cũ

Khi task chạm phân quyền hoặc điều hướng:

- đọc `lib/auth-helpers.ts`
- đọc `proxy.ts`
- đọc `components/nav.tsx`
- grep `requireAtLeast(` và `requireUser(`

Không được dựa vào spec thời `OWNER/STAFF` để suy quyền hiện tại.

### GUARD 5 — Phải phân biệt tài liệu hiện hành và snapshot lịch sử

- `README.md`, `docs/huong-dan-khach-hang.md`, `docs/production-checklist.md`,
  `docs/COLLAB-SOURCE-OF-TRUTH.md` là **hiện hành**
- `docs/superpowers/specs/*`, `docs/superpowers/plans/*`, `docs/bugs-log.md`
  là **lịch sử**

Nếu trích từ tài liệu lịch sử, phải nói rõ đó là bối cảnh tại thời điểm viết, không
phải hiện trạng.

## Mẫu handoff tối thiểu

Mỗi lần giao task cho model khác, nên có block mở đầu:

```md
Nguồn sự thật cần đọc trước:
- docs/COLLAB-SOURCE-OF-TRUTH.md
- AGENTS.md
- <các file code trực tiếp liên quan>

Task hiện tại:
- ...

Checklist luồng bắt buộc:
- schema
- migration
- validation
- action ghi
- query đọc
- UI render

Tiêu chí xong:
- typecheck/lint/build hoặc test phù hợp
- verify render thật / hành vi thật
```

## Phân vai gợi ý

- Model coder: mạnh ở implementation, migration, truy vấn, refactor tập trung.
- Model reviewer: soi end-to-end ngoài diff, kiểm guard dữ liệu/quyền.
- Model điều phối: giữ nguồn sự thật, cắt phạm vi, verify cuối độc lập.
