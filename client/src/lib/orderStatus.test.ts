import { describe, expect, it } from "vitest";
import { orderStatusLabel, readableStatus } from "./orderStatus";

describe("customer order labels", () => {
  it.each([
    ["pending", "Awaiting payment"], ["paid", "Payment received"],
    ["processing", "Preparing your order"], ["shipped", "On the way"],
    ["delivered", "Delivered"], ["cancelled", "Cancelled"],
  ])("explains %s without changing its state", (status, label) => {
    expect(orderStatusLabel(status)).toBe(label);
  });
  it("keeps unfamiliar provider information readable instead of inventing a delivery state", () => {
    expect(readableStatus("IN_TRANSIT")).toBe("In transit");
    expect(readableStatus("Awaiting customs clearance")).toBe("Awaiting customs clearance");
    expect(orderStatusLabel("on_hold")).toBe("On hold");
  });
});
