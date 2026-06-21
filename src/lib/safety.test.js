import { describe, expect, it } from "vitest";
import {
  FIELD_LIMITS,
  MAX_CONTACTS,
  clampText,
  normalizeContact,
  normalizeHttpsUrl,
  normalizeStoredContacts,
  normalizeStoredUsage,
} from "./safety";

describe("fake-user safety normalization", () => {
  it("falls back when contact storage is not an array", () => {
    const contacts = normalizeStoredContacts(
      { injected: true },
      [{ id: "seed", who: "Seed", kind: "Reached out", note: "", createdAt: "2026-06-21" }],
    );

    expect(contacts).toHaveLength(1);
    expect(contacts[0].who).toBe("Seed");
  });

  it("drops invalid contacts and clamps oversized fake user text", () => {
    const contacts = normalizeStoredContacts([
      null,
      { who: "", note: "ignored" },
      {
        id: "x".repeat(200),
        who: "<script>alert('xss')</script>" + "a".repeat(200),
        kind: { unsafe: true },
        note: "b".repeat(2_000),
        createdAt: "not-a-date",
      },
    ]);

    expect(contacts).toHaveLength(1);
    expect(contacts[0].id).toHaveLength(FIELD_LIMITS.id);
    expect(contacts[0].who).toHaveLength(FIELD_LIMITS.who);
    expect(contacts[0].kind).toBe("Reached out");
    expect(contacts[0].note).toHaveLength(FIELD_LIMITS.note);
    expect(Number.isFinite(new Date(contacts[0].createdAt).getTime())).toBe(true);
  });

  it("caps contact lists to prevent localStorage denial of service", () => {
    const contacts = normalizeStoredContacts(
      Array.from({ length: MAX_CONTACTS + 25 }, (_, index) => ({
        id: `fake-${index}`,
        who: `Fake ${index}`,
        kind: "Reached out",
        note: "",
        createdAt: "2026-06-21",
      })),
    );

    expect(contacts).toHaveLength(MAX_CONTACTS);
  });

  it("makes duplicated stored contact IDs unique for stable rendering", () => {
    const contacts = normalizeStoredContacts([
      { id: "same", who: "Fake One", kind: "Reached out", note: "", createdAt: "2026-06-21" },
      { id: "same", who: "Fake Two", kind: "Reached out", note: "", createdAt: "2026-06-21" },
    ]);

    expect(new Set(contacts.map((contact) => contact.id)).size).toBe(2);
  });

  it("keeps max-length duplicated IDs unique", () => {
    const id = "x".repeat(FIELD_LIMITS.id);
    const contacts = normalizeStoredContacts([
      { id, who: "Fake One", kind: "Reached out", note: "", createdAt: "2026-06-21" },
      { id, who: "Fake Two", kind: "Reached out", note: "", createdAt: "2026-06-21" },
    ]);

    expect(contacts[1].id).not.toBe(id);
    expect(contacts[1].id).toHaveLength(FIELD_LIMITS.id);
    expect(new Set(contacts.map((contact) => contact.id)).size).toBe(2);
  });

  it("normalizes usage counts to safe chart values", () => {
    const usage = normalizeStoredUsage([
      { date: "bad-date", count: 10 },
      { date: "2026-06-20", count: "4" },
      { date: "2026-06-21", count: 10_000 },
      { date: "2026-06-22", count: "nope" },
    ]);

    expect(usage).toEqual([
      { date: "2026-06-20", count: 4 },
      { date: "2026-06-21", count: 999 },
    ]);
  });

  it("removes control characters from user text", () => {
    expect(clampText("hello\u0000\nworld", 20)).toBe("hello  world");
  });

  it("only allows https URLs for clickable release targets", () => {
    expect(normalizeHttpsUrl("javascript:alert(1)", "https://example.com/fallback")).toBe(
      "https://example.com/fallback",
    );
    expect(normalizeHttpsUrl("https://github.com/rookepoole/threshold", "fallback")).toBe(
      "https://github.com/rookepoole/threshold",
    );
  });

  it("rejects malformed individual contacts", () => {
    expect(normalizeContact(["not", "an", "object"])).toBeNull();
  });
});
