export const dynamic = "force-dynamic";
import { requireAtLeast } from "@/lib/auth-helpers";
import { getUsers } from "@/lib/queries/users";
import { UserManager } from "@/components/user-manager";

export default async function NguoiDungPage() {
  const me = await requireAtLeast("ADMIN");
  const users = await getUsers();
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Quản lý người dùng</h1>
      <UserManager users={users} currentUserId={me.id} />
    </div>
  );
}
