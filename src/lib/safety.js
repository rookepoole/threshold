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

  const who = clampText(item.who, FIELD_LIMITS.who);
  if (!who) return null;

  return {
    id: clampText(item.id, FIELD_LIMITS.id) || `stored-contact-${index}`,
    who,
    kind: clampText(item.kind, FIELD_LIMITS.kind) || "Reached out",
    createdAt: normalizeIsoDate(item.createdAt),
    note: clampText(item.note, FIELD_LIMITS.note),
  };
}

export function normalizeStoredUsage(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object" || !DATE_KEY_PATTERN.test(item.date)) {
        return null;
      }

      const count = Number.parseInt(item.count, 10);
      if (!Number.isFinite(count)) return null;

      return {
        date: item.date,
        count: Math.min(Math.max(count, 0), 999),
      };
    })
    .filter(Boolean)
    .slice(-30);
}

export function normalizeIsoDate(value) {
  const date = new Date(value);
  if (Number.isFinite(date.getTime())) return date.toISOString();
  return new Date().toISOString();
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

function stripControlCharacters(value) {
  return Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127 ? " " : character;
  }).join("");
}
