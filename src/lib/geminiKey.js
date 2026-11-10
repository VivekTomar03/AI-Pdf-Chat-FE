// A user's own Gemini keys live in this browser only, namespaced by account so
// signing in as someone else on the same machine never reuses them. The list
// order is the order the server tries them in; the shared key comes last.
//
// Stored as [{ id, label, key }] under gemini_api_keys:<userId>.

export const MAX_KEYS = 5;
export const KEY_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

const listKey = (userId) => `gemini_api_keys:${userId}`;
// The previous version stored a single key per account under this name.
const singleKey = (userId) => `gemini_api_key:${userId}`;

const safely = (fn, fallback) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

let idCounter = 0;
export const makeKeyId = () => `${Date.now().toString(36)}-${(++idCounter).toString(36)}`;

export const getGeminiKeys = (userId) => {
  if (!userId) return [];
  return safely(() => {
    const stored = JSON.parse(localStorage.getItem(listKey(userId)) || "[]");
    if (Array.isArray(stored) && stored.length) {
      return stored.filter((entry) => entry && typeof entry.key === "string" && entry.id);
    }

    const legacy = localStorage.getItem(singleKey(userId));
    if (legacy) {
      const migrated = [{ id: makeKeyId(), label: "", key: legacy }];
      localStorage.setItem(listKey(userId), JSON.stringify(migrated));
      localStorage.removeItem(singleKey(userId));
      return migrated;
    }
    return [];
  }, []);
};

export const saveGeminiKeys = (userId, keys) =>
  safely(() => {
    if (keys.length) localStorage.setItem(listKey(userId), JSON.stringify(keys));
    else localStorage.removeItem(listKey(userId));
  }, undefined);

// Earlier versions stored one unscoped key that leaked across accounts.
export const removeLegacyGeminiKey = () =>
  safely(() => localStorage.removeItem("gemini_api_key"), undefined);

export const maskKey = (key) => (key.length > 12 ? `${key.slice(0, 4)}…${key.slice(-4)}` : "••••");

export const keyName = (entry, index) => entry?.label?.trim() || `Key ${index + 1}`;

// Names a key referenced by the server ({ source, index }) for display.
export const describeKeyRef = (ref, keys) => {
  if (!ref) return "a key";
  if (ref.source === "shared") return "the shared key";
  const entry = keys[ref.index];
  return entry?.label?.trim() ? `key ${ref.index + 1} (${entry.label.trim()})` : `key ${ref.index + 1}`;
};
