-- Thêm vai trò MANAGER (Quản lý cấp 1) — ở giữa ADMIN và KEEPER.
-- ADD VALUE tách migration RIÊNG: Postgres không cho ADD rồi dùng giá trị mới ngay
-- trong cùng transaction. Cấp được tính bằng map số trong code (không theo thứ tự enum).
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MANAGER';
