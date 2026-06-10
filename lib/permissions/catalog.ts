export type PermissionCategory =
  | "Phiếu nhập"
  | "Phiếu xuất"
  | "Chuyển kho"
  | "Kiểm kê"
  | "Báo cáo"
  | "Danh mục"
  | "Công trình"
  | "Quỹ"
  | "Người dùng";

export interface PermissionDefinition {
  code: string;
  name: string;
  category: PermissionCategory;
  description: string;
}

export interface PositionPreset {
  code: string;
  name: string;
  description: string;
  permissionCodes: string[];
}

export const PERMISSION_DEFINITIONS = [
  {
    code: "inventory.import.view",
    name: "Xem phiếu nhập",
    category: "Phiếu nhập",
    description: "Xem danh sách và chi tiết phiếu nhập.",
  },
  {
    code: "inventory.import.create",
    name: "Tạo phiếu nhập",
    category: "Phiếu nhập",
    description: "Lập và ghi sổ phiếu nhập kho.",
  },
  {
    code: "inventory.import.edit_posted",
    name: "Sửa phiếu nhập đã ghi sổ",
    category: "Phiếu nhập",
    description: "Sửa phiếu nhập đã ghi sổ bằng cơ chế revision.",
  },
  {
    code: "inventory.import.void",
    name: "Hủy phiếu nhập",
    category: "Phiếu nhập",
    description: "Hủy phiếu nhập đã ghi sổ.",
  },
  {
    code: "inventory.export.view",
    name: "Xem phiếu xuất",
    category: "Phiếu xuất",
    description: "Xem danh sách và chi tiết phiếu xuất.",
  },
  {
    code: "inventory.export.create",
    name: "Tạo phiếu xuất",
    category: "Phiếu xuất",
    description: "Lập và ghi sổ phiếu xuất kho.",
  },
  {
    code: "inventory.export.edit_posted",
    name: "Sửa phiếu xuất đã ghi sổ",
    category: "Phiếu xuất",
    description: "Sửa phiếu xuất đã ghi sổ bằng cơ chế revision.",
  },
  {
    code: "inventory.export.void",
    name: "Hủy phiếu xuất",
    category: "Phiếu xuất",
    description: "Hủy phiếu xuất đã ghi sổ.",
  },
  {
    code: "inventory.transfer.view",
    name: "Xem phiếu chuyển kho",
    category: "Chuyển kho",
    description: "Xem danh sách và chi tiết phiếu chuyển kho.",
  },
  {
    code: "inventory.transfer.create",
    name: "Tạo phiếu chuyển kho",
    category: "Chuyển kho",
    description: "Lập và ghi sổ phiếu chuyển kho.",
  },
  {
    code: "inventory.transfer.edit_posted",
    name: "Sửa phiếu chuyển kho đã ghi sổ",
    category: "Chuyển kho",
    description: "Sửa phiếu chuyển kho đã ghi sổ bằng cơ chế revision.",
  },
  {
    code: "inventory.transfer.void",
    name: "Hủy phiếu chuyển kho",
    category: "Chuyển kho",
    description: "Hủy phiếu chuyển kho đã ghi sổ.",
  },
  {
    code: "inventory.stocktake.view",
    name: "Xem kiểm kê",
    category: "Kiểm kê",
    description: "Xem danh sách và chi tiết phiếu kiểm kê.",
  },
  {
    code: "inventory.stocktake.create",
    name: "Tạo kiểm kê",
    category: "Kiểm kê",
    description: "Tạo phiếu kiểm kê kho.",
  },
  {
    code: "inventory.stocktake.edit",
    name: "Sửa kiểm kê",
    category: "Kiểm kê",
    description: "Cập nhật số đếm thực tế khi phiếu còn được sửa.",
  },
  {
    code: "inventory.stocktake.approve",
    name: "Duyệt kiểm kê",
    category: "Kiểm kê",
    description: "Duyệt phiếu kiểm kê để sinh điều chỉnh tồn.",
  },
  {
    code: "inventory.stocktake.void",
    name: "Hủy kiểm kê",
    category: "Kiểm kê",
    description: "Hủy phiếu kiểm kê đã duyệt.",
  },
  {
    code: "inventory.history.view",
    name: "Xem lịch sử",
    category: "Báo cáo",
    description: "Xem lịch sử giao dịch tồn kho.",
  },
  {
    code: "inventory.report.view",
    name: "Xem báo cáo",
    category: "Báo cáo",
    description: "Xem báo cáo tồn kho và định mức.",
  },
  {
    code: "catalog.view",
    name: "Xem danh mục",
    category: "Danh mục",
    description: "Xem danh mục kho, vật tư, đơn vị tính và nhà cung cấp.",
  },
  {
    code: "catalog.manage",
    name: "Sửa danh mục",
    category: "Danh mục",
    description: "Tạo và sửa danh mục kho, vật tư, đơn vị tính và nhà cung cấp.",
  },
  {
    code: "project.view",
    name: "Xem công trình",
    category: "Công trình",
    description: "Xem công trình, hạng mục và định mức.",
  },
  {
    code: "project.manage",
    name: "Sửa công trình",
    category: "Công trình",
    description: "Tạo và sửa công trình, hạng mục.",
  },
  {
    code: "norm.manage",
    name: "Sửa định mức",
    category: "Công trình",
    description: "Tạo và sửa định mức vật tư theo hạng mục.",
  },
  {
    code: "fund.view",
    name: "Xem quỹ",
    category: "Quỹ",
    description: "Xem quỹ công trình và báo cáo quỹ.",
  },
  {
    code: "fund.create",
    name: "Tạo phiếu quỹ",
    category: "Quỹ",
    description: "Lập phiếu thu hoặc chi quỹ.",
  },
  {
    code: "fund.edit_posted",
    name: "Sửa phiếu quỹ đã ghi sổ",
    category: "Quỹ",
    description: "Sửa phiếu quỹ đã ghi sổ.",
  },
  {
    code: "fund.void",
    name: "Hủy phiếu quỹ",
    category: "Quỹ",
    description: "Hủy phiếu quỹ đã ghi sổ.",
  },
  {
    code: "user.manage",
    name: "Quản lý người dùng",
    category: "Người dùng",
    description: "Tạo người dùng và cập nhật thông tin cơ bản.",
  },
  {
    code: "permission.manage",
    name: "Phân quyền",
    category: "Người dùng",
    description: "Tick quyền chức năng cho người dùng.",
  },
] as const satisfies readonly PermissionDefinition[];

export type PermissionCode = (typeof PERMISSION_DEFINITIONS)[number]["code"];

export const KNOWN_PERMISSION_CODES = new Set<string>(
  PERMISSION_DEFINITIONS.map((permission) => permission.code)
);

const ALL_PERMISSION_CODES = PERMISSION_DEFINITIONS.map((permission) => permission.code);

const DOCUMENT_EDIT_CODES = [
  "inventory.import.edit_posted",
  "inventory.export.edit_posted",
  "inventory.transfer.edit_posted",
];

export const POSITION_PRESETS = {
  ADMIN: {
    code: "ADMIN",
    name: "Admin",
    description: "Toàn quyền trên phần mềm.",
    permissionCodes: ALL_PERMISSION_CODES,
  },
  QUAN_LY: {
    code: "QUAN_LY",
    name: "Quản lý",
    description: "Quản lý công trường, chứng từ, báo cáo, quỹ và danh mục.",
    permissionCodes: [
      "catalog.view",
      "catalog.manage",
      "project.view",
      "project.manage",
      "norm.manage",
      "fund.view",
      "fund.create",
      "fund.edit_posted",
      "fund.void",
      "inventory.history.view",
      "inventory.report.view",
      "inventory.import.view",
      "inventory.import.create",
      "inventory.import.void",
      "inventory.export.view",
      "inventory.export.create",
      "inventory.export.void",
      "inventory.transfer.view",
      "inventory.transfer.create",
      "inventory.transfer.void",
      "inventory.stocktake.view",
      "inventory.stocktake.create",
      "inventory.stocktake.edit",
      "inventory.stocktake.approve",
      "inventory.stocktake.void",
      ...DOCUMENT_EDIT_CODES,
    ],
  },
  THU_KHO: {
    code: "THU_KHO",
    name: "Thủ kho",
    description: "Thao tác kho hằng ngày và xem báo cáo cần thiết.",
    permissionCodes: [
      "catalog.view",
      "inventory.history.view",
      "inventory.report.view",
      "inventory.import.view",
      "inventory.import.create",
      "inventory.export.view",
      "inventory.export.create",
      "inventory.transfer.view",
      "inventory.transfer.create",
      "inventory.stocktake.view",
      "inventory.stocktake.create",
      "inventory.stocktake.edit",
      ...DOCUMENT_EDIT_CODES,
    ],
  },
} as const satisfies Record<string, PositionPreset>;

export type PositionCode = keyof typeof POSITION_PRESETS;
