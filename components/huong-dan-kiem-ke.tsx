import { ClipboardEdit, CheckCircle2, BarChart3 } from "lucide-react";

const steps = [
  {
    icon: ClipboardEdit,
    title: "1. Nhập số đếm thực tế",
    desc: "Mở phiếu, sửa ô \"Số đếm thực tế\" cho từng vật liệu. Chênh lệch so với sổ sẽ hiện ngay.",
  },
  {
    icon: CheckCircle2,
    title: "2. Chủ duyệt phiếu",
    desc: "Chủ mở phiếu và bấm \"Duyệt phiếu\". Lúc này hao hụt mới được ghi nhận vào kho.",
  },
  {
    icon: BarChart3,
    title: "3. Xem ở Báo cáo",
    desc: "Vào trang Báo cáo để thấy hao hụt thống kê theo tháng và theo nguyên nhân.",
  },
];

export function HuongDanKiemKe() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
      <p className="mb-3 text-sm font-semibold text-blue-900 dark:text-blue-200">
        💡 Cách kiểm kê để ghi nhận hao hụt
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="flex gap-2.5">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  {s.title}
                </div>
                <div className="text-xs text-blue-700/80 dark:text-blue-300/70">
                  {s.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
