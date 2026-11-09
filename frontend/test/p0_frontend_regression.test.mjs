import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, "../src");

describe("P0 Frontend Blocker Verifications", () => {
  test("App.jsx passes isOpen to DeviceDetailModal based on selectedDevice", () => {
    const appContent = fs.readFileSync(path.join(srcDir, "App.jsx"), "utf-8");

    // Must pass isOpen={Boolean(selectedDevice)} or isOpen={!!selectedDevice}
    const hasIsOpenProp =
      appContent.includes("<DeviceDetailModal") &&
      /isOpen=\{Boolean\(selectedDevice\)\}/.test(appContent);

    assert.ok(
      hasIsOpenProp,
      "App.jsx must pass isOpen={Boolean(selectedDevice)} to DeviceDetailModal",
    );
  });

  test("App.jsx passes onDeviceUpdated callback to DeviceDetailModal", () => {
    const appContent = fs.readFileSync(path.join(srcDir, "App.jsx"), "utf-8");

    const hasOnDeviceUpdatedProp =
      appContent.includes("<DeviceDetailModal") &&
      /onDeviceUpdated=\{performFetch\}/.test(appContent);

    assert.ok(
      hasOnDeviceUpdatedProp,
      "App.jsx must pass onDeviceUpdated={performFetch} to DeviceDetailModal",
    );
  });

  test("App.jsx passes onDeviceCreated callback to AddDeviceModal", () => {
    const appContent = fs.readFileSync(path.join(srcDir, "App.jsx"), "utf-8");

    const hasOnDeviceCreatedProp =
      appContent.includes("<AddDeviceModal") &&
      /onDeviceCreated=\{performFetch\}/.test(appContent);

    assert.ok(
      hasOnDeviceCreatedProp,
      "App.jsx must pass onDeviceCreated={performFetch} to AddDeviceModal",
    );
  });

  test("DeviceDetailModal requires isOpen to render and invokes onDeviceUpdated on status update", () => {
    const modalContent = fs.readFileSync(
      path.join(srcDir, "components/DeviceDetailModal.jsx"),
      "utf-8",
    );

    // Verify isOpen prop is received in signature
    assert.ok(
      modalContent.includes("isOpen"),
      "DeviceDetailModal must receive isOpen prop",
    );

    // Verify guard clause checks isOpen
    assert.ok(
      modalContent.includes("if (!isOpen || !device) return null;"),
      "DeviceDetailModal must return null when isOpen is falsy",
    );

    // Verify onDeviceUpdated is invoked when status changes
    assert.ok(
      modalContent.includes("onDeviceUpdated(updatedDevice)"),
      "DeviceDetailModal must call onDeviceUpdated with the updated device",
    );

    // Verify onClose is invoked to close modal
    assert.ok(
      modalContent.includes("onClose()"),
      "DeviceDetailModal must invoke onClose on dismiss",
    );
  });

  test("AddDeviceModal invokes onDeviceCreated on successful registration", () => {
    const addModalContent = fs.readFileSync(
      path.join(srcDir, "components/AddDeviceModal.jsx"),
      "utf-8",
    );

    // Verify prop name in signature
    assert.ok(
      addModalContent.includes("onDeviceCreated"),
      "AddDeviceModal must receive onDeviceCreated prop",
    );

    // Verify callback invocation
    assert.ok(
      addModalContent.includes("onDeviceCreated(newDevice)"),
      "AddDeviceModal must invoke onDeviceCreated with the created device",
    );
  });
});
