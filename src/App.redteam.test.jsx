import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;

describe("App red-team storage scenarios", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    delete window.__thresholdPwned;
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    if (root) {
      act(() => root.unmount());
      root = undefined;
    }
    vi.restoreAllMocks();
  });

  it("renders poisoned fake user storage without executing markup or crashing", async () => {
    window.localStorage.setItem(
      "threshold.contacts.v1",
      JSON.stringify([
        "not-an-object",
        {
          id: "attacker",
          who: "<script>window.__thresholdPwned = true</script>",
          kind: "<img src=x onerror=alert(1)>",
          note: "x".repeat(2_000),
          createdAt: "not-a-date",
        },
      ]),
    );
    window.localStorage.setItem(
      "threshold.usage.v1",
      JSON.stringify([{ date: "2026-06-21", count: "not-a-number" }]),
    );

    await act(async () => {
      root = createRoot(document.getElementById("root"));
      root.render(<App />);
    });

    expect(document.body.textContent).toContain("You have reached out to a real person 1 times");
    expect(document.body.textContent).toContain("<script>");
    expect(document.querySelector(".feed-item script")).toBeNull();
    expect(window.__thresholdPwned).toBeUndefined();
  });

  it("stays usable when the browser rejects localStorage writes", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage full");
    });

    await act(async () => {
      root = createRoot(document.getElementById("root"));
      root.render(<App />);
    });

    expect(document.body.textContent).toContain("Out there is the point");
  });
});
