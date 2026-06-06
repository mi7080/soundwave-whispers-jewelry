import { describe, it, expect } from "vitest";
import {
  US_STATE_CODES,
  isUsStateCode,
  isUsZip,
  normalizeUsPhone,
} from "@/lib/usAddress";

describe("US state codes", () => {
  it("includes 50 states plus DC", () => {
    expect(US_STATE_CODES.size).toBe(51);
  });

  it("accepts valid codes case-insensitively", () => {
    expect(isUsStateCode("CA")).toBe(true);
    expect(isUsStateCode("ny")).toBe(true);
    expect(isUsStateCode(" DC ")).toBe(true);
  });

  it("rejects invalid or empty codes", () => {
    expect(isUsStateCode("XX")).toBe(false);
    expect(isUsStateCode("California")).toBe(false);
    expect(isUsStateCode("")).toBe(false);
    expect(isUsStateCode(null)).toBe(false);
  });
});

describe("isUsZip", () => {
  it("accepts 5-digit and ZIP+4", () => {
    expect(isUsZip("12345")).toBe(true);
    expect(isUsZip("12345-6789")).toBe(true);
    expect(isUsZip(" 90210 ")).toBe(true);
  });

  it("rejects malformed ZIPs", () => {
    expect(isUsZip("1234")).toBe(false);
    expect(isUsZip("123456")).toBe(false);
    expect(isUsZip("12345-678")).toBe(false);
    expect(isUsZip("ABCDE")).toBe(false);
    expect(isUsZip("")).toBe(false);
  });
});

describe("normalizeUsPhone", () => {
  it("normalizes a bare 10-digit number", () => {
    expect(normalizeUsPhone("5551234567")).toBe("+15551234567");
  });

  it("strips formatting", () => {
    expect(normalizeUsPhone("(555) 123-4567")).toBe("+15551234567");
    expect(normalizeUsPhone("555.123.4567")).toBe("+15551234567");
  });

  it("drops a leading country code 1", () => {
    expect(normalizeUsPhone("15551234567")).toBe("+15551234567");
    expect(normalizeUsPhone("+1 555 123 4567")).toBe("+15551234567");
  });

  it("rejects numbers that are too short or too long", () => {
    expect(normalizeUsPhone("123456789")).toBeNull();
    expect(normalizeUsPhone("255512345678")).toBeNull();
  });

  it("rejects area codes starting with 0 or 1", () => {
    expect(normalizeUsPhone("0551234567")).toBeNull();
    expect(normalizeUsPhone("1551234567")).toBeNull();
  });

  it("rejects letters and empty input", () => {
    expect(normalizeUsPhone("abcdefghij")).toBeNull();
    expect(normalizeUsPhone("")).toBeNull();
    expect(normalizeUsPhone(null)).toBeNull();
  });
});
