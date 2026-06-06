# Audit dọn dẹp thư mục vatlieu-kho — 2026-06-06

> Mục đích: tìm cái THỪA + cái GÂY NHẦM/ảnh hưởng bảo trì (user lo lắng sau vụ
> nhầm Neon/Supabase khi deploy). Claude tự audit + verify từng mục (agy được giao
> nhưng bị lú context, làm sai task → Claude tự làm). MỌI mục đã verify từ artifact.

## 🔴 ƯU TIÊN CAO — GÂY NHẦM NGUY HIỂM (gốc của vụ Neon/Supabase)

### 1. Tham chiếu "Neon" rải rác — production GIỜ là SUPABASE
Production từng dùng Neon → đã chuyển Supabase, NHƯNG tham chiếu Neon cũ không dọn.
ĐÂY chính xác là cái khiến Claude nhầm production là Neon khi deploy.
| File | Loại | Đề xuất |
|---|---|---|
| `app/api/ping/route.ts:14-15` | GÂY-NHẦM (comment "Prisma ↔ Neon") | SỬA: đổi "Neon" → "Supabase" trong comment |
| `docs/bugs-log.md:22` | GÂY-NHẦM (mô tả DB Neon ở Mỹ) | SỬA/ghi chú: thêm dòng "(đã chuyển Supabase Singapore 2026-06)" |
| `docs/production-checklist.md:63,97` | GÂY-NHẦM (Neon PITR, free tier) | SỬA: đổi Neon → Supabase |
| `docs/superpowers/plans/2026-06-03-multi-warehouse.md:1215` | GÂY-NHẦM (migration trên Neon) | GIỮ (plan lịch sử) nhưng có thể thêm note |
| `docs/superpowers/specs/2026-06-04-...:138,146` | GÂY-NHẦM (.env.local→Neon) | GIỮ (spec lịch sử) — thực tế nay là Supabase |

**Khuyến nghị:** SỬA tối thiểu `app/api/ping/route.ts` (CODE — nguy hiểm nhất) +
`production-checklist.md` + `bugs-log.md` (docs vận hành hay đọc). Plans/specs lịch
sử thì thêm 1 dòng cảnh báo "DB nay là Supabase" ở đầu, không sửa nội dung cũ.

### 2. KHÔNG còn dùng Neon thật → cân nhắc gỡ integration Neon trên Vercel
Env Vercel còn cả key NEON_*/POSTGRES_* (integration cũ) — app KHÔNG đọc (chỉ đọc
DATABASE_URL/DIRECT_URL = Supabase). Để lại = đống key rác gây nhầm.
**Đề xuất:** user gỡ Neon integration trên Vercel dashboard (Storage) khi rảnh —
giảm rối env. KHÔNG gấp (app không đọc), nhưng nên làm để hết nhầm.

## 🟡 ƯU TIÊN TRUNG — RÁC LỊCH SỬ (tracked, làm rối, không nguy hiểm)

| File | Loại | Lý do | Đề xuất |
|---|---|---|---|
| `docs/superpowers/AGY-SPEC-B-ui-phieu.md` | THỪA | task file Phase B đã xong | XÓA |
| `docs/superpowers/AGY-SPEC-C-ui.md` | THỪA | task Phase C xong | XÓA |
| `docs/superpowers/AGY-SPEC-E-ui.md` | THỪA | task Phase E xong | XÓA |
| `docs/superpowers/AGY-SPEC-G-form-fields.md` | THỪA | task xong | XÓA |
| `docs/superpowers/AGY-REVIEW-QUY.md` | THỪA | review Quỹ xong | XÓA |
| `docs/AI-CHANNEL.md` | THỪA | kênh thí nghiệm 2 AI (xong) | XÓA (giữ kết luận ở AI-COLLAB-GUIDE) |
| `prisma/migrate-project-data.ts` | TRUNG | script di trú đã chạy 1 lần (local+prod) | GIỮ (idempotent, tài liệu di trú) HOẶC chuyển vào docs |

## ✅ ĐÃ VERIFY — KHÔNG phải rác (suýt báo nhầm)

| File | Kết luận |
|---|---|
| `components/loss-charts.tsx` | DÙNG ở bao-cao/page.tsx — GIỮ (grep path thiếu, grep export `LossCharts` mới thấy) |
| `components/material-select.tsx` | DÙNG ở document-line-editor + opening-stock-form — GIỮ |
| `.env` (root, localhost:5433) | ĐÚNG cho dev local — GIỮ (không phải rác) |
| `docker-compose.yml` (postgres 5433) | ĐÚNG cho dev local — GIỮ |
| `.env.example` (template rỗng) | ĐÚNG chuẩn — GIỮ |
| 8 specs trong docs/superpowers/specs/ | tài liệu thiết kế lịch sử — GIỮ (không mâu thuẫn nguy hiểm) |

## 🟢 BÀI HỌC RÚT RA (chống nhầm tương lai)
1. **Khi production đổi hạ tầng (Neon→Supabase), PHẢI dọn tham chiếu cũ NGAY** —
   để lại rải rác = bom hẹn giờ gây nhầm (đã nổ 1 lần khi deploy).
2. **1 nguồn sự thật cho "DB production là gì":** nên ghi rõ ở 1 chỗ (vd README
   hoặc CLAUDE.md): "Production = Supabase Singapore; Neon là integration cũ đã bỏ".
3. **Verify dead code bằng tên export, không phải path** (suýt xóa nhầm 2 component).
4. **agy không tự chạy audit được** (lú context, làm task cũ) — cần Claude verify.

## BẢNG TÓM TẮT
| Loại | Số mục | Hành động |
|---|---|---|
| 🔴 Gây nhầm (Neon refs) | ~6 chỗ | SỬA code/docs vận hành; gỡ Neon integration |
| 🟡 Rác lịch sử | 6 file | XÓA (5 AGY-* + AI-CHANNEL) |
| ✅ Tưởng rác nhưng GIỮ | 6 | không động |

---
## ĐÃ XỬ LÝ (2026-06-06)
- ✅ Sửa tham chiếu Neon→Supabase: app/api/ping/route.ts (code), production-checklist.md, bugs-log.md (note).
- ✅ Thêm NGUỒN SỰ THẬT hạ tầng vào AGENTS.md (section "Hạ tầng").
- ✅ Xóa 6 file rác: 5 AGY-SPEC/REVIEW + AI-CHANNEL.md.
- ✅ NGẮT Neon integration khỏi Vercel (resource neon-green-marble) → env hết key NEON_*/POSTGRES_* rác. Verify: production vẫn chạy (login 200, /cong-trinh 200); DATABASE_URL/DIRECT_URL Supabase còn nguyên. Data Neon cũ (4 kho, 37 movements) VẪN còn ở Neon dashboard (chỉ ngắt liên kết, không xóa DB).
- ✅ Verify KHÔNG có dead component (loss-charts + material-select đang dùng).
