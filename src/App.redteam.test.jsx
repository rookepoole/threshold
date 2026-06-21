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
    expect(draft.toLowerCase()).not.toContain("adoption");
    expect(draft.toLowerCase()).not.toContain("gave me up");
    expect(draft.toLowerCase()).not.toContain("fuck");
    expect(document.querySelector(".coach-box").textContent).toContain("softened");
  });

  it("uses accountability language when fake users are trying to apologize", async () => {
    const cases = [
      {
        who: "my sister",
        goal: "say sorry for hitting her",
        draft: "fuck you",
        expected: [
          "Hey Sister",
          "I am sorry I hit you",
          "That was not okay",
          "take responsibility",
        ],
        forbidden: [
          "complicated feelings",
          "I would like",
          "if you are open",
          "hitting her",
          "say sorry for hitting her",
        ],
      },
      {
        who: "my brother",
        goal: "apologize for yelling at him",
        draft: "",
        expected: ["Hey Brother", "I am sorry I yelled at you"],
        forbidden: ["yelling at him", "if you are open"],
      },
      {
        who: "old friend Alex",
        goal: "I want to apologize for disappearing",
        draft: "I miss you",
        expected: ["Hey Alex", "I am sorry I disappeared"],
        forbidden: ["I would like", "No pressure"],
      },
      {
        who: "Maya",
        goal: "I should apologize to her for breaking her trust",
        draft: "",
        expected: ["Hey Maya", "I am sorry about breaking your trust"],
        forbidden: ["breaking her trust", "if you are open"],
      },
      {
        who: "Jordan",
        goal: "I owe him an apology for ignoring him",
        draft: "",
        expected: ["Hey Jordan", "I am sorry I ignored you"],
        forbidden: ["ignoring him", "I owe him"],
      },
      {
        who: "Sam",
        goal: "I want an apology",
        draft: "you owe me",
        expected: ["Hey Sam", "complicated feelings", "talk about what happened"],
        forbidden: ["I am sorry", "take responsibility"],
      },
    ];

    for (const item of cases) {
      await renderApp();
      await clickButton("Rehearse");
      await setFieldValue("#who", item.who);
      await setFieldValue("#goal", item.goal);
      await setFieldValue("#draft", item.draft);
      await submitForm(".form-stack");

      const draft = document.querySelector("#draft").value;

      for (const expected of item.expected) {
        expect(draft).toContain(expected);
      }

      for (const forbidden of item.forbidden) {
        expect(draft.toLowerCase()).not.toContain(forbidden.toLowerCase());
      }

      act(() => root.unmount());
      root = undefined;
      document.body.innerHTML = '<div id="root"></div>';
    }
  });

  it("keeps fake-user rehearse outputs calm, grammatical, and safe", async () => {
    const cases = [
      {
        who: "My Mom",
        goal: "I want to reconnect she put me up for adoption",
        draft: "fuck you",
        expected: ["Hey Mom", "complicated feelings", "I would like to reconnect"],
        forbidden: ["put me up", "adoption", "to reconnect she"],
      },
      {
        who: "my ex",
        goal: "I want closure, not a fight",
        draft: "you ruined me",
        expected: ["Hey there", "complicated feelings", "talk about closure"],
        forbidden: ["Hey My,", "to i want", "you ruined me"],
      },
      {
        who: "the neighbor upstairs",
        goal: "Ask them to keep it down after midnight",
        draft: "shut the hell up",
        expected: ["Hey there", "ask them to keep it down after midnight"],
        forbidden: ["Hey The,", "shut the hell up"],
      },
      {
        who: "Jordan",
        goal: "make them pay",
        draft: "I will hurt you if you ignore me",
        expected: ["Hey Jordan", "take some space", "respectful"],
        forbidden: ["hurt you", "make them pay"],
      },
      {
        who: "Taylor",
        goal: "I need help tonight",
        draft: "I do not want to be alive",
        expected: ["Hey Taylor", "could use support", "check in"],
        forbidden: ["do not want to be alive", "to i need"],
      },
      {
        who: "my old friend Priya",
        goal: "catch up sometime",
        draft: "I miss our talks",
        expected: ["Hey Priya", "catch up sometime soon"],
        forbidden: ["Hey My,"],
      },
      {
        who: "the hiking group",
        goal: "ask if I can come along",
        draft: "",
        expected: ["Hey everyone", "ask if I can come along"],
        forbidden: ["Hey The,"],
      },
      {
        who: "Dr. Lee",
        goal: "schedule a follow-up",
        draft: "I am worried about what we discussed",
        expected: ["Hey Dr. Lee", "schedule a follow-up"],
        forbidden: ["Hey Dr.,"],
      },
    ];

    for (const item of cases) {
      await renderApp();
      await clickButton("Rehearse");
      await setFieldValue("#who", item.who);
      await setFieldValue("#goal", item.goal);
      await setFieldValue("#draft", item.draft);
      await submitForm(".form-stack");

      const draft = document.querySelector("#draft").value;

      for (const expected of item.expected) {
        expect(draft).toContain(expected);
      }

      for (const forbidden of item.forbidden) {
        expect(draft.toLowerCase()).not.toContain(forbidden.toLowerCase());
      }

      expect(draft).not.toMatch(/\bto\s+i\s+(want|need|hope|would like)\b/i);
      expect(draft).not.toMatch(/[<>]|script|onerror/i);

      act(() => root.unmount());
      root = undefined;
      document.body.innerHTML = '<div id="root"></div>';
    }
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
