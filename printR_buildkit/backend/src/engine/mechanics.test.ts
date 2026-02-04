import { describe, it, expect } from "vitest";
import { CONST, computeTickReturn, marketRegimeMultiplier, mcDamp, rMaxDynamic, nextPrice } from "./mechanics.js";

describe("mechanics constants", () => {
  it("core constants", () => {
    expect(CONST.P_MIN).toBe(0.01);
    expect(CONST.PCT_MULT).toBe(100);
    expect(CONST.LEV_MAX).toBe(5);
    expect(CONST.R_LO).toBe(0.01);
    expect(CONST.R_HI).toBe(0.10);
  });

  it("market regime multiplier bounds", () => {
    expect(marketRegimeMultiplier(1)).toBeGreaterThanOrEqual(CONST.G_MIN);
    expect(marketRegimeMultiplier(100)).toBeLessThanOrEqual(CONST.G_MAX);
  });

  it("mcDamp clamped", () => {
    expect(mcDamp(1)).toBeLessThanOrEqual(CONST.D_MAX);
    expect(mcDamp(1e18)).toBeGreaterThanOrEqual(CONST.D_MIN);
  });
});

describe("returns and clamping", () => {
  it("clamps r", () => {
    const { r, rMax } = computeTickReturn({
      supply: 1_000_000,
      price: 5,
      marketIndex: 100,
      archetype: "THIN_FLOAT",
      z: 1,
      demand: 1
    });
    expect(r).toBeLessThanOrEqual(rMax);
    expect(r).toBeGreaterThanOrEqual(-rMax);
  });

  it("nextPrice respects P_MIN", () => {
    const p = nextPrice(0.01, -0.1);
    expect(p).toBeGreaterThanOrEqual(CONST.P_MIN);
  });

  it("rMaxDynamic bounds", () => {
    const rMax = rMaxDynamic({ supply: 1_000_000_000, price: 1000, marketIndex: 50, archetype: "DEEP_POOL" });
    expect(rMax).toBeGreaterThanOrEqual(CONST.R_LO);
    expect(rMax).toBeLessThanOrEqual(CONST.R_HI);
  });
});
