export const MAX_CONTACTS = 100;

export const FIELD_LIMITS = {
  who: 120,
  kind: 48,
  goal: 180,
  draft: 700,
  note: 700,
  id: 96,
  releaseName: 160,
  releaseBody: 4_000,
};

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function clampText(value, maxLength) {
  if (typeof value !== "string" && typeof value !== "number") return "";

  return stripControlCharacters(String(value)).trim().slice(0, maxLength);
}

export function cleanMessageText(value, maxLength) {
  return clampText(value, maxLength)
    .replace(/<script\b[^>]*>.*?<\\?\/script>/gi, " ")
    .replace(/<style\b[^>]*>.*?<\\?\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeStoredContacts(value, fallbackContacts = []) {
  const source = Array.isArray(value) ? value : fallbackContacts;
  const contacts = [];
  const seenIds = new Set();

  for (const item of source) {
    const contact = normalizeContact(item, contacts.length);
    if (contact) {
      contacts.push(makeUniqueContactId(contact, seenIds, contacts.length));
    }

    if (contacts.length >= MAX_CONTACTS) break;
  }

  return contacts;
}

export function normalizeContact(item, index = 0) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;

  const who = cleanMessageText(item.who, FIELD_LIMITS.who);
  if (!who) return null;

  return {
    id: clampText(item.id, FIELD_LIMITS.id) || `stored-contact-${index}`,
    who,
    kind: cleanMessageText(item.kind, FIELD_LIMITS.kind) || "Reached out",
    createdAt: normalizeIsoDate(item.createdAt),
    note: cleanMessageText(item.note, FIELD_LIMITS.note),
  };
}

export function normalizeStoredUsage(value) {
  if (!Array.isArray(value)) return [];

  const byDate = new Map();

  for (const item of value) {
    if (!item || typeof item !== "object" || !isValidDateKey(item.date)) continue;

    const count = Number.parseInt(item.count, 10);
    if (!Number.isFinite(count)) continue;

    byDate.set(item.date, Math.min(Math.max(count, 0), 999));
  }

  return Array.from(byDate, ([date, count]) => ({ date, count }))
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-30);
}

export function normalizeIsoDate(value) {
  if (typeof value !== "string" && typeof value !== "number") {
    return new Date().toISOString();
  }

  const date = new Date(value);
  const now = new Date();
  if (Number.isFinite(date.getTime()) && date.getTime() <= now.getTime()) {
    return date.toISOString();
  }

  return now.toISOString();
}

export function normalizeOptionalIsoDate(value) {
  if (typeof value !== "string" && typeof value !== "number") return "";

  const date = new Date(value);
  if (Number.isFinite(date.getTime())) return date.toISOString();
  return "";
}

export function normalizeHttpsUrl(value, fallbackUrl) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return url.toString();
  } catch {
    return fallbackUrl;
  }

  return fallbackUrl;
}

function makeUniqueContactId(contact, seenIds, index) {
  if (!seenIds.has(contact.id)) {
    seenIds.add(contact.id);
    return contact;
  }

  let attempt = index;
  let uniqueId = contact.id;

  while (seenIds.has(uniqueId)) {
    const suffix = `-${attempt}`;
    const prefixLength = Math.max(FIELD_LIMITS.id - suffix.length, 1);
    uniqueId = `${contact.id.slice(0, prefixLength)}${suffix}`;
    attempt += 1;
  }

  seenIds.add(uniqueId);
  return { ...contact, id: uniqueId };
}

function isValidDateKey(value) {
  if (typeof value !== "string") return false;
  if (!DATE_KEY_PATTERN.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function stripControlCharacters(value) {
  return Array.from(value, (character) => {
    const code = character.codePointAt(0);
    return isUnsafeControlCode(code) ? " " : character;
  }).join("");
}

function isUnsafeControlCode(code) {
  return (
    code <= 31 ||
    code === 127 ||
    code === 173 ||
    (code >= 0x200b && code <= 0x200f) ||
    (code >= 0x202a && code <= 0x202e) ||
    (code >= 0x2060 && code <= 0x206f) ||
    code === 0xfeff
  );
}
