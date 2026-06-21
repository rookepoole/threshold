import { useCallback, useEffect, useMemo, useState } from "react";
import {
  APP_VERSION,
  REPOSITORY,
  fetchLatestRelease,
  isReleaseNewer,
} from "./lib/releases";
import {
  FIELD_LIMITS,
  clampText,
  normalizeContact,
  normalizeStoredContacts,
  normalizeStoredUsage,
} from "./lib/safety";

const CONTACTS_KEY = "threshold.contacts.v1";
const USAGE_KEY = "threshold.usage.v1";

const TABS = [
  ["door", "The door"],
  ["rehearse", "Rehearse"],
  ["step", "Step out"],
  ["debrief", "Debrief"],
  ["updates", "Updates"],
];

const MOMENT_KINDS = ["Reached out", "Showed up", "Said yes", "Stayed a while"];

const STEP_RAMPS = [
  {
    title: "Go where people already are",
    examples: [
      "A library reading room",
      "A coffee shop with your book",
      "A park bench at a busy hour",
    ],
    why: "Presence first. Proximity lowers the wall before any words do.",
  },
  {
    title: "A room with a shared task",
    examples: [
      "A drop-in craft circle",
      "A volunteer shift sorting donations",
      "A community garden hour",
    ],
    why: "The task carries the conversation, so you do not have to.",
  },
  {
    title: "A standing thing you can return to",
    examples: [
      "A weekly class",
      "A run club or walking group",
      "A faith or community gathering",
    ],
    why: "Familiar faces over time are how strangers become people you know.",
  },
  {
    title: "One person, one small ask",
    examples: [
      "Text someone: Coffee this week?",
      "Reply to the friend you left on read",
      "Call a family member for five minutes",
    ],
    why: "The whole bridge is built from single planks like this.",
  },
];

function createSeedContacts() {
  return [
    {
      id: "seed-maya",
      who: "Maya (sister)",
      kind: "Texted back",
      createdAt: daysAgo(3),
      note: "Said we'd grab coffee.",
    },
    {
      id: "seed-library",
      who: "Library knitting circle",
      kind: "Showed up",
      createdAt: daysAgo(7),
      note: "Stayed 40 minutes. Talked to one person.",
    },
  ];
}

export default function App() {
  const [tab, setTab] = useState("door");
  const [contacts, setContacts] = useStoredState(
    CONTACTS_KEY,
    createSeedContacts,
    (value) => normalizeStoredContacts(value, createSeedContacts()),
  );
  const [usage, setUsage] = useStoredState(USAGE_KEY, [], normalizeStoredUsage);
  const reduceMotion = useReducedMotion();
  const install = useInstallPrompt();

  useEffect(() => {
    const sessionKey = `threshold.opened.${toDateKey(new Date())}`;
    if (safeSessionGet(sessionKey)) return;
    safeSessionSet(sessionKey, "true");
    setUsage((current) => recordTodayUsage(current));
  }, [setUsage]);

  const appOpens = useMemo(() => getRecentUsage(usage, 7), [usage]);

  function logContact(contact) {
    const safeContact = normalizeContact(
      {
        id: createId(),
        createdAt: new Date().toISOString(),
        who: contact.who,
        kind: contact.kind,
        note: contact.note,
      },
      0,
    );

    if (!safeContact) return;

    setContacts((current) => [
      safeContact,
      ...current,
    ]);
    setTab("door");
  }

  return (
    <div className="app-shell">
      <Header tab={tab} setTab={setTab} install={install} />
      <main className="main" id="main">
        {tab === "door" && (
          <Door
            contacts={contacts}
            appOpens={appOpens}
            reduceMotion={reduceMotion}
            go={setTab}
            install={install}
          />
        )}
        {tab === "rehearse" && <Rehearse onLogged={() => setTab("debrief")} />}
        {tab === "step" && <StepOut />}
        {tab === "debrief" && <Debrief onLog={logContact} />}
        {tab === "updates" && <Updates install={install} />}
      </main>
      <FootNote />
    </div>
  );
}

function Header({ tab, setTab, install }) {
  return (
    <header className="header">
      <a className="brand-row" href="#main" aria-label="Threshold home">
        <DoorMark size={26} open={0.55} />
        <span className="brand">Threshold</span>
      </a>
      <div className="header-actions">
        <nav className="nav" aria-label="Sections">
          {TABS.map(([id, label]) => (
            <button
              type="button"
              key={id}
              onClick={() => setTab(id)}
              className={tab === id ? "nav-button nav-button-active" : "nav-button"}
              aria-current={tab === id ? "page" : undefined}
            >
              {label}
            </button>
          ))}
        </nav>
        {!install.isInstalled && (
          <button
            type="button"
            className="install-button"
            onClick={install.requestInstall}
            disabled={install.status === "prompting"}
          >
            <InstallIcon size={16} />
            <span>{install.status === "prompting" ? "Opening" : "Install"}</span>
          </button>
        )}
      </div>
    </header>
  );
}

function Door({ contacts, appOpens, reduceMotion, go, install }) {
  const count = contacts.length;
  const openness = Math.min(1, 0.18 + count * 0.16);
  const trendDown =
    appOpens.length > 1 && appOpens[appOpens.length - 1] < appOpens[0];

  return (
    <div className="stack">
      <section className="hero" aria-labelledby="door-title">
        <Doorway openness={openness} reduceMotion={reduceMotion} />
        <div className="hero-copy">
          <p className="eyebrow">Out there is the point</p>
          <h1 className="page-title" id="door-title">
            You have reached out to a real person{" "}
            <span className="accent-word">{count} times</span> lately.
          </h1>
          <p className="lede">
            The door opens wider every time you do. That is the number here
            worth growing.
          </p>
          <div className="button-row">
            <button type="button" className="button button-primary" onClick={() => go("step")}>
              Find one small step
            </button>
            <button
              type="button"
              className="button button-ghost"
              onClick={() => go("rehearse")}
            >
              Rehearse something hard
            </button>
          </div>
        </div>
      </section>

      {!install.isInstalled && <InstallPanel install={install} />}

      <section className="metrics-grid" aria-label="Progress">
        <Metric
          label="Real human moments"
          value={count}
          hint="Logged in this browser"
          accent="sage"
          good="up"
        />
        <UsageMetric opens={appOpens} down={trendDown} />
      </section>

      <section aria-labelledby="done-title">
        <div className="section-heading">
          <h2 id="done-title">What you have already done</h2>
          <button
            type="button"
            className="text-button"
            onClick={() => go("debrief")}
          >
            Log a moment
          </button>
        </div>
        <ol className="feed">
          {contacts.map((contact) => (
            <li key={contact.id} className="feed-item">
              <span className="feed-dot" aria-hidden />
              <div>
                <div className="feed-top">
                  <strong>{contact.who}</strong>
                  <span>{formatRelativeDate(contact.createdAt)}</span>
                </div>
                <div className="feed-kind">{contact.kind}</div>
                {contact.note && <p>{contact.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function InstallPanel({ install }) {
  return (
    <section className="install-panel" aria-labelledby="install-title">
      <div className="install-panel-icon" aria-hidden="true">
        <InstallIcon size={26} />
      </div>
      <div className="install-panel-copy">
        <p className="eyebrow">Install</p>
        <h2 id="install-title">Keep Threshold one tap away.</h2>
        <p>
          Add the app to this device for a focused window, quick launch, and
          the same local notes you already keep here.
        </p>
        <p className="install-help">{installStatusText(install)}</p>
      </div>
      <button
        type="button"
        className="button button-sage install-panel-action"
        onClick={install.requestInstall}
        disabled={install.status === "prompting"}
      >
        {install.status === "prompting"
          ? "Opening"
          : install.canPrompt
            ? "Install Threshold"
            : "Show install option"}
      </button>
    </section>
  );
}

function Doorway({ openness, reduceMotion }) {
  const swing = 6 + openness * 64;

  return (
    <div className="door-wrap" aria-hidden="true">
      <svg viewBox="0 0 220 260" width="100%" height="100%" role="img">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbe3b8" />
            <stop offset="55%" stopColor="#e8743b" />
            <stop offset="100%" stopColor="#c85a28" />
          </linearGradient>
          <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(232,116,59,0.55)" />
            <stop offset="100%" stopColor="rgba(232,116,59,0)" />
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="38%" r="60%">
            <stop offset="0%" stopColor="rgba(251,227,184,0.9)" />
            <stop offset="100%" stopColor="rgba(251,227,184,0)" />
          </radialGradient>
        </defs>
        <rect x="62" y="34" width="96" height="186" rx="3" fill="url(#sky)" />
        <circle
          cx="110"
          cy="96"
          r="26"
          fill="url(#glow)"
          className={reduceMotion ? undefined : "door-glow"}
        />
        <polygon points="62,220 158,220 184,256 36,256" fill="url(#floor)" />
        <rect
          x="50"
          y="22"
          width="120"
          height="206"
          rx="4"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="8"
        />
        <rect
          x="58"
          y="30"
          width="104"
          height="192"
          rx="2"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="2"
          opacity="0.35"
        />
        <g>
          <polygon
            points={`62,34 ${62 - swing},44 ${62 - swing},214 62,220`}
            fill="var(--ink)"
          />
          <polygon
            points={`62,34 ${62 - swing},44 ${62 - swing},214 62,220`}
            fill="rgba(255,255,255,0.04)"
          />
          <circle cx={62 - swing + 8} cy="130" r="2.4" fill="var(--ember)" />
        </g>
      </svg>
    </div>
  );
}

function Metric({ label, value, hint, accent, good }) {
  return (
    <article className="metric">
      <div className={`metric-value metric-value-${accent}`}>
        {value}
        {good === "up" && <Arrow up />}
      </div>
      <div className="metric-label">{label}</div>
      <div className="metric-hint">{hint}</div>
    </article>
  );
}

function UsageMetric({ opens, down }) {
  const max = Math.max(...opens, 1);

  return (
    <article className="metric">
      <div className="spark" aria-hidden="true">
        {opens.map((value, index) => (
          <span
            key={`${value}-${index}`}
            className={index === opens.length - 1 ? "spark-bar spark-bar-live" : "spark-bar"}
            style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="metric-label">Times you opened Threshold</div>
      <div className={down ? "metric-hint metric-hint-good" : "metric-hint"}>
        {down ? "Trending down. That is the goal." : "Holding steady."}
      </div>
    </article>
  );
}

function Arrow({ up }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="arrow" aria-hidden="true">
      <path
        d={up ? "M8 3 L13 9 H9 V13 H7 V9 H3 Z" : "M8 13 L3 7 H7 V3 H9 V7 H13 Z"}
        fill="currentColor"
      />
    </svg>
  );
}

function Rehearse({ onLogged }) {
  const [who, setWho] = useState("");
  const [goal, setGoal] = useState("");
  const [draft, setDraft] = useState("");
  const [coach, setCoach] = useState("");
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    if (!who.trim() || !goal.trim()) {
      setError("Add who it is for and what you are hoping for.");
      return;
    }

    const nextDraft = buildSuggestedMessage({ who, goal, draft });
    setError("");
    setDraft(nextDraft);
    setCoach(
      "This keeps the ask clear and low-pressure. Right before you send, breathe once and let it be imperfect.",
    );
  }

  async function copyDraft() {
    try {
      if (!navigator.clipboard?.writeText) {
        setCopyStatus("Copy unavailable");
        return;
      }

      await navigator.clipboard.writeText(draft);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy unavailable");
    }
  }

  return (
    <section className="panel" aria-labelledby="rehearse-title">
      <p className="eyebrow">Rehearse</p>
      <h1 className="page-title" id="rehearse-title">
        Practice the hard message. Then you send it.
      </h1>
      <p className="lede">
        Threshold helps you find the words, then hands the moment back to you.
      </p>

      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="who">
          Who is it to?
        </label>
        <input
          id="who"
          value={who}
          onChange={(event) => setWho(event.target.value)}
          maxLength={FIELD_LIMITS.who}
          placeholder="A sister, an old friend, the group you keep meaning to join"
        />

        <label className="field-label" htmlFor="goal">
          What are you hoping for?
        </label>
        <input
          id="goal"
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          maxLength={FIELD_LIMITS.goal}
          placeholder="Reconnect, say sorry, ask if I can come along"
        />

        <label className="field-label" htmlFor="draft">
          Your draft
        </label>
        <textarea
          id="draft"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={FIELD_LIMITS.draft}
          placeholder="Even one rough line is enough to begin."
        />

        {error && (
          <div className="notice notice-error" role="alert">
            {error}
          </div>
        )}

        <div className="button-row">
          <button type="submit" className="button button-primary">
            Help me find the words
          </button>
        </div>
      </form>

      {coach && (
        <div className="coach-box" role="status">
          <DoorMark size={18} open={0.7} />
          <p>{coach}</p>
        </div>
      )}

      {draft && (
        <div className="handoff">
          <p>
            When it feels ready, move it into your own messages and press send
            there.
          </p>
          <div className="button-row">
            <button type="button" className="button button-ghost" onClick={copyDraft}>
              Copy the message
            </button>
            <button type="button" className="button button-sage" onClick={onLogged}>
              I sent it
            </button>
            {copyStatus && <span className="inline-status">{copyStatus}</span>}
          </div>
        </div>
      )}
    </section>
  );
}

function StepOut() {
  return (
    <section className="panel" aria-labelledby="step-title">
      <p className="eyebrow">Step out</p>
      <h1 className="page-title" id="step-title">
        The smallest real step that is still a step.
      </h1>
      <p className="lede">
        Not a leap. Pick one thing that puts you near actual people on an actual
        day.
      </p>

      <div className="ramp-grid">
        {STEP_RAMPS.map((ramp) => (
          <article key={ramp.title} className="ramp">
            <h2>{ramp.title}</h2>
            <ul>
              {ramp.examples.map((example) => (
                <li key={example}>{example}</li>
              ))}
            </ul>
            <p>{ramp.why}</p>
          </article>
        ))}
      </div>

      <p className="search-hint">
        Search your town name with library events, volunteer, community center,
        class, walking group, or open studio.
      </p>
    </section>
  );
}

function Debrief({ onLog }) {
  const [who, setWho] = useState("");
  const [how, setHow] = useState("");
  const [kind, setKind] = useState(MOMENT_KINDS[0]);
  const [error, setError] = useState("");

  function save(event) {
    event.preventDefault();
    if (!who.trim()) {
      setError("Add who it was with.");
      return;
    }

    onLog({ who, kind, note: how });
  }

  return (
    <section className="panel" aria-labelledby="debrief-title">
      <p className="eyebrow">Debrief</p>
      <h1 className="page-title" id="debrief-title">
        You did a real thing. Mark it.
      </h1>
      <p className="lede">
        Easy, awkward, half-finished, all of it counts.
      </p>

      <form className="form-stack" onSubmit={save}>
        <label className="field-label" htmlFor="debrief-who">
          Who was it with?
        </label>
        <input
          id="debrief-who"
          value={who}
          onChange={(event) => setWho(event.target.value)}
          maxLength={FIELD_LIMITS.who}
          placeholder="Maya, the knitting circle, the person at the desk"
        />

        <fieldset className="chip-field">
          <legend>What did you do?</legend>
          <div className="chip-row">
            {MOMENT_KINDS.map((option) => (
              <button
                type="button"
                key={option}
                className={kind === option ? "chip chip-active" : "chip"}
                onClick={() => setKind(option)}
                aria-pressed={kind === option}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="field-label" htmlFor="debrief-how">
          How did it feel?
        </label>
        <textarea
          id="debrief-how"
          value={how}
          onChange={(event) => setHow(event.target.value)}
          maxLength={FIELD_LIMITS.note}
          placeholder="Lighter than I expected. Still nervous. Glad I went."
        />

        {error && (
          <div className="notice notice-error" role="alert">
            {error}
          </div>
        )}

        <div className="button-row">
          <button type="submit" className="button button-sage">
            Log it and open the door wider
          </button>
        </div>
      </form>
    </section>
  );
}

function Updates({ install }) {
  const [status, setStatus] = useState("idle");
  const [release, setRelease] = useState(null);
  const [error, setError] = useState("");
  const [pulling, setPulling] = useState(false);

  const newer = release ? isReleaseNewer(APP_VERSION, release.tagName) : false;

  async function checkRelease() {
    setStatus("checking");
    setError("");

    try {
      const latest = await fetchLatestRelease();
      setRelease(latest);
      setStatus(latest ? "ready" : "none");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Release check failed.");
      setStatus("error");
    }
  }

  async function pullLatestBuild() {
    setPulling(true);
    setError("");

    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.update()));
        navigator.serviceWorker.controller?.postMessage({
          type: "THRESHOLD_SKIP_WAITING",
        });
      }

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith("threshold-"))
            .map((key) => caches.delete(key)),
        );
      }

      const url = new URL(window.location.href);
      url.searchParams.set("release-refresh", Date.now().toString());
      window.location.replace(url.toString());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not refresh the app.");
      setPulling(false);
    }
  }

  useEffect(() => {
    checkRelease();
  }, []);

  return (
    <section className="panel" aria-labelledby="updates-title">
      <p className="eyebrow">Updates</p>
      <h1 className="page-title" id="updates-title">
        Release channel
      </h1>
      <p className="lede">
        Running version {APP_VERSION} from {REPOSITORY}.
      </p>

      {!install.isInstalled && <InstallPanel install={install} />}

      <article className="release-card" aria-live="polite">
        <div className="release-card-head">
          <div>
            <h2>Latest GitHub release</h2>
            <p>{release ? release.tagName : releaseStatusText(status)}</p>
          </div>
          <button
            type="button"
            className="button button-ghost"
            onClick={checkRelease}
            disabled={status === "checking"}
          >
            {status === "checking" ? "Checking" : "Check now"}
          </button>
        </div>

        {release && (
          <div className="release-body">
            <div className={newer ? "version-pill version-pill-new" : "version-pill"}>
              {newer ? "Update available" : "Up to date"}
            </div>
            <h3>{release.name}</h3>
            {release.publishedAt && (
              <p className="muted">
                Published {new Date(release.publishedAt).toLocaleDateString()}
              </p>
            )}
            {release.body && <p className="release-notes">{release.body}</p>}
            <div className="button-row">
              <button
                type="button"
                className="button button-primary"
                onClick={pullLatestBuild}
                disabled={pulling}
              >
                {pulling ? "Pulling" : "Pull latest release"}
              </button>
              <a
                className="button button-ghost"
                href={release.htmlUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open release
              </a>
            </div>
          </div>
        )}

        {status === "none" && (
          <div className="notice">
            No releases exist yet. Tag a version like v0.1.0 to publish the
            first one.
          </div>
        )}

        {error && (
          <div className="notice notice-error" role="alert">
            {error}
          </div>
        )}
      </article>
    </section>
  );
}

function FootNote() {
  return (
    <footer className="foot">
      <DoorMark size={16} open={0.85} />
      <p>
        Threshold is built to make itself unnecessary. The day you forget to
        open it because you were busy with someone real, that is the day it
        worked.
      </p>
    </footer>
  );
}

function DoorMark({ size = 20, open = 0.5 }) {
  const swing = 2 + open * 6;

  return (
    <svg
      className="door-mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect
        x="6"
        y="3"
        width="13"
        height="18"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect x="8" y="5" width="9" height="14" fill="currentColor" opacity="0.16" />
      <polygon points={`6,3 ${6 - swing},5 ${6 - swing},19 6,21`} fill="currentColor" />
      <circle cx={6 - swing + 1.4} cy="12" r="0.9" fill="var(--ember)" />
    </svg>
  );
}

function InstallIcon({ size = 20 }) {
  return (
    <svg
      className="install-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12 3v10.2m0 0 4-4m-4 4-4-4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M5 14.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [status, setStatus] = useState("waiting");
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState("desktop");

  useEffect(() => {
    setPlatform(detectInstallPlatform());
    setIsInstalled(isStandaloneApp());
    setStatus(isStandaloneApp() ? "installed" : "waiting");

    function onBeforeInstallPrompt(event) {
      event.preventDefault();
      setPromptEvent(event);
      setStatus("ready");
    }

    function onAppInstalled() {
      setPromptEvent(null);
      setIsInstalled(true);
      setStatus("installed");
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function requestInstall() {
    if (isInstalled) return;

    if (!promptEvent) {
      setStatus("manual");
      return;
    }

    setStatus("prompting");

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      setPromptEvent(null);

      if (choice?.outcome === "accepted") {
        setIsInstalled(true);
        setStatus("installed");
        return;
      }

      setStatus("dismissed");
    } catch {
      setPromptEvent(null);
      setStatus("manual");
    }
  }

  return {
    canPrompt: Boolean(promptEvent),
    isInstalled,
    platform,
    requestInstall,
    status,
  };
}

function useStoredState(key, initialValue, normalize = (current) => current) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return normalize(resolveInitial(initialValue));

    try {
      const saved = window.localStorage.getItem(key);
      return normalize(saved ? JSON.parse(saved) : resolveInitial(initialValue));
    } catch {
      return normalize(resolveInitial(initialValue));
    }
  });

  const setNormalizedValue = useCallback(
    (nextValue) => {
      setValue((current) =>
        normalize(typeof nextValue === "function" ? nextValue(current) : nextValue),
      );
    },
    [normalize],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage may be full or disabled; keep the in-memory app usable.
    }
  }, [key, value]);

  return [value, setNormalizedValue];
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);

    function onChange(event) {
      setReduced(event.matches);
    }

    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function buildSuggestedMessage({ who, goal, draft }) {
  const safeDraft = clampText(draft, FIELD_LIMITS.draft);
  if (safeDraft) return safeDraft;

  const name = firstName(clampText(who, FIELD_LIMITS.who));
  const normalizedGoal = normalizeGoal(clampText(goal, FIELD_LIMITS.goal));
  return `Hey ${name}, I was thinking about you and wanted to say hi. No pressure, but I would like to ${normalizedGoal}.`;
}

function normalizeGoal(goal) {
  const clean = goal
    .trim()
    .replace(/[.?!]+$/, "")
    .replace(/^(just\s+)?to\s+/i, "")
    .toLowerCase();

  return clean || "catch up sometime soon";
}

function firstName(value) {
  const withoutParentheses = value.replace(/\(.+\)/, "").trim();
  return withoutParentheses.split(/\s+/)[0] || "there";
}

function recordTodayUsage(usage) {
  const safeUsage = normalizeStoredUsage(usage);
  const today = toDateKey(new Date());
  const existing = safeUsage.find((item) => item.date === today);

  if (existing) {
    return safeUsage.map((item) =>
      item.date === today ? { ...item, count: item.count + 1 } : item,
    );
  }

  return [...safeUsage, { date: today, count: 1 }].slice(-30);
}

function getRecentUsage(usage, days) {
  const safeUsage = normalizeStoredUsage(usage);
  const byDate = new Map(safeUsage.map((item) => [item.date, item.count]));

  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - index - 1));
    return byDate.get(toDateKey(date)) ?? 0;
  });
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(count) {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return date.toISOString();
}

function formatRelativeDate(value) {
  const then = new Date(value);
  if (!Number.isFinite(then.getTime())) return "Unknown date";

  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays <= 0) return "Just now";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return then.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function releaseStatusText(status) {
  if (status === "checking") return "Checking releases";
  if (status === "error") return "Release check failed";
  if (status === "none") return "No releases yet";
  return "Waiting to check";
}

function installStatusText({ canPrompt, platform, status }) {
  if (status === "ready" || canPrompt) return "Ready to install on this device.";
  if (status === "prompting") return "Opening your browser's install flow.";
  if (status === "dismissed") return "No pressure. The install option will stay here.";

  if (platform === "ios") {
    return "On iPhone or iPad, use Share, then Add to Home Screen.";
  }

  if (platform === "android") {
    return "On Android, use the browser install or Add to Home Screen option.";
  }

  return "On desktop, use the browser install option from this page.";
}

function detectInstallPlatform() {
  const userAgent = navigator.userAgent || "";
  const isiPadOS =
    navigator.platform === "MacIntel" && Number(navigator.maxTouchPoints) > 1;

  if (/iphone|ipad|ipod/i.test(userAgent) || isiPadOS) return "ios";
  if (/android/i.test(userAgent)) return "android";
  return "desktop";
}

function isStandaloneApp() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function resolveInitial(initialValue) {
  return typeof initialValue === "function" ? initialValue() : initialValue;
}

function safeSessionGet(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    return undefined;
  }
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
