-- Đổi tên giá trị enum Role (OWNER->ADMIN, STAFF->KEEPER).
-- RENAME VALUE: rows hiện có TỰ đổi theo, không UPDATE, không drop type. An toàn data live.
ALTER TYPE "Role" RENAME VALUE 'OWNER' TO 'ADMIN';
ALTER TYPE "Role" RENAME VALUE 'STAFF' TO 'KEEPER';
