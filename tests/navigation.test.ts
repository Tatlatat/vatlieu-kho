import assert from "node:assert/strict";
import { visibleNavLinks } from "../lib/navigation";

assert.deepEqual(
  visibleNavLinks(["project.view"]).map((link) => link.label),
  ["Trang chính", "Danh mục"]
);

assert.equal(
  visibleNavLinks(["catalog.view", "project.view"]).some((link) => link.label === "Công trình"),
  false
);

console.log("navigation tests passed");
