import assert from "node:assert/strict";
import { hasOwnerAccess, normalizeAppRole } from "../lib/roles";

assert.equal(normalizeAppRole("OWNER"), "OWNER");
assert.equal(normalizeAppRole("ADMIN"), "OWNER");
assert.equal(normalizeAppRole("STAFF"), "STAFF");
assert.equal(normalizeAppRole("MANAGER"), "STAFF");
assert.equal(normalizeAppRole("KEEPER"), "STAFF");
assert.equal(normalizeAppRole(undefined), "STAFF");

assert.equal(hasOwnerAccess("OWNER"), true);
assert.equal(hasOwnerAccess("ADMIN"), true);
assert.equal(hasOwnerAccess("STAFF"), false);
assert.equal(hasOwnerAccess("KEEPER"), false);

console.log("role-normalization tests passed");
