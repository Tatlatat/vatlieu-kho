import type { Role } from "@/lib/auth-helpers";

export function validateRequestedTransferApprover(input: {
  currentUserId: string;
  requestedApproverId: string | null | undefined;
  requestedApproverRole: Role | null | undefined;
}) {
  if (!input.requestedApproverId) {
    throw new Error("Vui lòng chọn thủ kho đích duyệt phiếu");
  }
  if (input.requestedApproverId === input.currentUserId) {
    throw new Error("Người lập phiếu không được chọn chính mình làm người duyệt.");
  }
  if (input.requestedApproverRole !== "KEEPER") {
    throw new Error("Thủ kho đích duyệt phiếu phải là người dùng vai trò Thủ kho.");
  }
}
