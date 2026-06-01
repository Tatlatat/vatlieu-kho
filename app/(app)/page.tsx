import { requireUser } from "@/lib/auth-helpers";

export default async function HomePage() {
  const user = await requireUser();
  return (
    <div>
      <h1 className="text-2xl font-bold">Xin chào, {user.name}</h1>
      <p className="mt-2 text-slate-500">
        Trang chính sẽ hiển thị tồn kho và các thao tác nhanh (đang xây dựng).
      </p>
    </div>
  );
}
