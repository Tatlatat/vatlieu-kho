import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton dùng chung cho mọi trang trong nhóm (app).
 * Next.js hiển thị file này TỨC THÌ khi chuyển trang (trong lúc Server
 * Component đang chờ query DB), nên người dùng không còn thấy "đứng hình".
 */
export default function AppLoading() {
  return (
    <div className="space-y-6">
      {/* tiêu đề trang */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* hàng nút thao tác / card tổng quan */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* bảng dữ liệu */}
      <div className="rounded-xl border bg-white">
        <div className="border-b px-4 py-3">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
