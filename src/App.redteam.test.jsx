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
          who: "Maya <script>window.__thresholdPwned = true</script>",
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
    expect(document.body.textContent).toContain("Maya");
    expect(document.body.textContent).not.toContain("<script>");
    expect(document.body.textContent).not.toContain("onerror");
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

  it("renders a large fake-user population without unsafe nodes or deceptive text", async () => {
    const fakeContacts = Array.from({ length: 250 }, (_, index) => ({
      id: "x".repeat(96),
      who: `<script>window.__thresholdPwned = true</script>Fake ${index}\u202Egpj.exe`,
      kind: "<img src=x onerror=alert(1)>",
      note: `note-${index}\u200B${"A".repeat(2_000)}`,
      createdAt: index % 2 === 0 ? "3026-06-21T00:00:00.000Z" : "not-a-date",
    }));

    window.localStorage.setItem("threshold.contacts.v1", JSON.stringify(fakeContacts));

    await renderApp();

    expect(document.querySelectorAll(".feed-item")).toHaveLength(100);
    expect(document.querySelector(".feed-item script")).toBeNull();
    expect(document.querySelector(".feed-item img")).toBeNull();
    expect(document.body.textContent).not.toContain("<script>");
    expect(document.body.textContent).not.toContain("onerror");
    expect(document.body.textContent).not.toContain("\u202E");
    expect(document.body.textContent).not.toContain("\u200B");
    expect(document.body.textContent).not.toContain("Invalid Date");
    expect(window.__thresholdPwned).toBeUndefined();
  });

  it("keeps generated message responses clean when fake users enter markup", async () => {
    await renderApp();
    await clickButton("Rehearse");
    await setFieldValue("#who", "<script>window.__thresholdPwned = true</script> Maya");
    await setFieldValue("#goal", "to <img src=x onerror=alert(1)>!!!");
    await submitForm(".form-stack");

    const draft = document.querySelector("#draft").value;

    expect(draft).toContain("Hey Maya");
    expect(draft).not.toContain("<");
    expect(draft).not.toContain("script");
    expect(draft).not.toContain("onerror");
    expect(window.__thresholdPwned).toBeUndefined();
  });

  it("rewrites heated rough drafts instead of preserving them", async () => {
    await renderApp();
    await clickButton("Rehearse");
    await setFieldValue("#who", "My mom");
    await setFieldValue(
      "#goal",
      "She gave me up for adoption and I want to reconnect",
    );
    await setFieldValue("#draft", "fuck you");
    await submitForm(".form-stack");

    const draft = document.querySelector("#draft").value;

    expect(draft).toContain("Hey Mom");
    expect(draft).toContain("complicated feelings");
    expect(draft).toContain("reconnect");
    expect(draft.toLowerCase()).not.toContain("fuck");
    expect(document.querySelector(".coach-box").textContent).toContain("softened");
  });
});

async function renderApp() {
  await act(async () => {
    root = createRoot(document.getElementById("root"));
    root.render(<App />);
  });
}

async function clickButton(label) {
  const button = Array.from(document.querySelectorAll("button")).find((item) =>
    item.textContent.includes(label),
  );
  expect(button).toBeTruthy();

  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

async function setFieldValue(selector, value) {
  const field = document.querySelector(selector);
  expect(field).toBeTruthy();

  const descriptor = Object.getOwnPropertyDescriptor(field.constructor.prototype, "value");

  await act(async () => {
    descriptor.set.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
  });
}

async function submitForm(selector) {
  const form = document.querySelector(selector);
  expect(form).toBeTruthy();

  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}
