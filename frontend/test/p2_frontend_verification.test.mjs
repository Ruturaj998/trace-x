import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, "../src");

describe("P2 Frontend Security & Real-Time Tracking Verifications", () => {
  test("api.js includes credentials: include and CSRF token handling", () => {
    const apiContent = fs.readFileSync(path.join(srcDir, "services/api.js"), "utf-8");

    assert.ok(
      apiContent.includes('credentials: "include"'),
      "api.js must configure requests with credentials: 'include'",
    );

    assert.ok(
      apiContent.includes("X-CSRF-Token"),
      "api.js must attach X-CSRF-Token header to state-changing requests",
    );

    assert.ok(
      apiContent.includes("generateDeviceToken"),
      "api.js must export generateDeviceToken",
    );

    assert.ok(
      apiContent.includes("revokeDeviceToken"),
      "api.js must export revokeDeviceToken",
    );

    assert.ok(
      apiContent.includes("syncOfflineLocations"),
      "api.js must export syncOfflineLocations",
    );
  });

  test("DeviceDetailModal.jsx provides edge telemetry credential controls", () => {
    const modalContent = fs.readFileSync(
      path.join(srcDir, "components/DeviceDetailModal.jsx"),
      "utf-8",
    );

    assert.ok(
      modalContent.includes("generateDeviceToken"),
      "DeviceDetailModal must import/call generateDeviceToken",
    );

    assert.ok(
      modalContent.includes("revokeDeviceToken"),
      "DeviceDetailModal must import/call revokeDeviceToken",
    );

    assert.ok(
      modalContent.includes("CONNECTIVITY"),
      "DeviceDetailModal must display connectivity status",
    );

    assert.ok(
      modalContent.includes("LAST SEEN"),
      "DeviceDetailModal must display last seen timestamp",
    );
  });

  test("StatusBadge.jsx supports real-time connectivity states", () => {
    const badgeContent = fs.readFileSync(
      path.join(srcDir, "components/common/StatusBadge.jsx"),
      "utf-8",
    );

    assert.ok(
      badgeContent.includes("online"),
      "StatusBadge must support online status",
    );

    assert.ok(
      badgeContent.includes("offline"),
      "StatusBadge must support offline status",
    );

    assert.ok(
      badgeContent.includes("never_connected"),
      "StatusBadge must support never_connected status",
    );
  });
});
