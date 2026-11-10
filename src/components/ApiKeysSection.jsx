import { useState } from "react";
import { ArrowDown, ArrowUp, Check, CircleAlert, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import api, { errorMessage } from "../lib/api";
import {
  getGeminiKeys,
  KEY_PATTERN,
  keyName,
  makeKeyId,
  maskKey,
  MAX_KEYS,
  saveGeminiKeys,
} from "../lib/geminiKey";

function CheckResult({ result }) {
  if (!result) return null;

  const content = {
    checking: [<span key="s" className="spinner spinner--sm" aria-hidden="true" />, "Checking…"],
    valid: [<Check key="i" size={14} strokeWidth={2} aria-hidden="true" />, "Accepted by Google"],
    limited: [<CircleAlert key="i" size={14} strokeWidth={1.75} aria-hidden="true" />, "Accepted, but rate-limited right now"],
    rejected: [<CircleAlert key="i" size={14} strokeWidth={1.75} aria-hidden="true" />, "Rejected by Google. This key won't work."],
    error: [<CircleAlert key="i" size={14} strokeWidth={1.75} aria-hidden="true" />, result.message],
  }[result.state];

  return (
    <p className={`key-check key-check--${result.state}`} role="status">
      {content}
    </p>
  );
}

// The user's Gemini keys, in the order the server tries them.
export default function ApiKeysSection({ userId }) {
  const [keys, setKeys] = useState(() => getGeminiKeys(userId));
  const [checks, setChecks] = useState({});
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [showValue, setShowValue] = useState(false);
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState("");

  const commit = (next, message) => {
    setKeys(next);
    saveGeminiKeys(userId, next);
    setStatus(message);
  };

  const check = async (entry) => {
    setChecks((prev) => ({ ...prev, [entry.id]: { state: "checking" } }));
    try {
      const res = await api.post("/keys/check", { key: entry.key });
      setChecks((prev) => ({ ...prev, [entry.id]: { state: res.data.status } }));
    } catch (err) {
      setChecks((prev) => ({
        ...prev,
        [entry.id]: { state: "error", message: errorMessage(err, "This key couldn't be checked.") },
      }));
    }
  };

  const add = (event) => {
    event.preventDefault();
    setFormError("");
    const key = value.trim();

    if (!KEY_PATTERN.test(key)) {
      setFormError("That doesn't look like a Gemini API key. Copy the whole key from Google AI Studio.");
      return;
    }
    if (keys.some((entry) => entry.key === key)) {
      setFormError("This key is already in the list.");
      return;
    }

    const entry = { id: makeKeyId(), label: label.trim().slice(0, 40), key };
    commit([...keys, entry], `${keyName(entry, keys.length)} added.`);
    setLabel("");
    setValue("");
    setShowValue(false);
    check(entry);
  };

  const remove = (entry, index) => {
    if (!window.confirm(`Remove ${keyName(entry, index)} from this browser?`)) return;
    commit(
      keys.filter((item) => item.id !== entry.id),
      `${keyName(entry, index)} removed.`
    );
  };

  const move = (index, direction) => {
    const next = [...keys];
    const target = index + direction;
    [next[index], next[target]] = [next[target], next[index]];
    commit(next, `${keyName(keys[index], index)} will now be tried ${ordinal(target + 1)}.`);
  };

  return (
    <section className="settings-section" aria-labelledby="settings-keys">
      <h2 id="settings-keys" className="settings-title">
        Gemini API keys
      </h2>
      <p className="settings-text">
        Add up to {MAX_KEYS} of your own keys. They are used in this order. When a key reaches its rate limit or stops
        working, the next one takes over at once, even halfway through an answer. It gets the same chat history and the
        same sources, and carries on from where the answer stopped, so nothing is lost. Free keys are available from{" "}
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
          Google AI Studio
        </a>
        .
      </p>

      <ol className="key-list" aria-label="Keys, in the order they are tried">
        {keys.map((entry, index) => (
          <li key={entry.id} className="key-item">
            <span className="key-rank" aria-hidden="true">
              {index + 1}
            </span>
            <div className="key-main">
              <p className="key-name">
                {keyName(entry, index)}
                {index === 0 && <span className="tag">Tried first</span>}
              </p>
              <p className="key-value">{maskKey(entry.key)}</p>
              <CheckResult result={checks[entry.id]} />
            </div>
            <div className="key-actions">
              <button
                type="button"
                className="icon-btn"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Move ${keyName(entry, index)} up`}
              >
                <ArrowUp size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => move(index, 1)}
                disabled={index === keys.length - 1}
                aria-label={`Move ${keyName(entry, index)} down`}
              >
                <ArrowDown size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                onClick={() => check(entry)}
                disabled={checks[entry.id]?.state === "checking"}
              >
                Check
              </button>
              <button
                type="button"
                className="icon-btn icon-btn--danger"
                onClick={() => remove(entry, index)}
                aria-label={`Remove ${keyName(entry, index)}`}
              >
                <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
        <li className="key-item key-item--shared">
          <span className="key-rank" aria-hidden="true">
            {keys.length + 1}
          </span>
          <div className="key-main">
            <p className="key-name">Shared key</p>
            <p className="key-sub">Always tried last. Its small daily limit is shared by everyone using this app.</p>
          </div>
        </li>
      </ol>

      {keys.length < MAX_KEYS ? (
        <form className="key-add" onSubmit={add} noValidate>
          <div className="field key-add-label">
            <label htmlFor="key-label" className="field-label">
              Name <span className="field-optional">optional</span>
            </label>
            <input
              id="key-label"
              className="input"
              value={label}
              maxLength={40}
              placeholder="e.g. Personal"
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
          <div className="field key-add-value">
            <label htmlFor="key-value" className="field-label">
              API key
            </label>
            <div className="input-wrap">
              <input
                id="key-value"
                type={showValue ? "text" : "password"}
                className="input input--mono"
                value={value}
                placeholder="AIza…"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(formError)}
                aria-describedby={formError ? "key-error key-help" : "key-help"}
                onChange={(event) => setValue(event.target.value)}
              />
              <button
                type="button"
                className="input-adorn"
                onClick={() => setShowValue(!showValue)}
                aria-label={showValue ? "Hide key" : "Show key"}
                aria-pressed={showValue}
              >
                {showValue ? (
                  <EyeOff size={17} strokeWidth={1.75} aria-hidden="true" />
                ) : (
                  <Eye size={17} strokeWidth={1.75} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary key-add-submit">
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Add key
          </button>
          {formError && (
            <p id="key-error" className="field-error" role="alert">
              {formError}
            </p>
          )}
        </form>
      ) : (
        <p className="field-help">You've added the maximum of {MAX_KEYS} keys. Remove one to add another.</p>
      )}

      <p id="key-help" className="field-help">
        Keys are stored only in this browser, for this account. They're sent with each request so the server can call
        Gemini for you, and are never saved on the server. “Check” confirms that Google accepts a key; it can't see how
        much of today's quota is left.
      </p>
      {status && (
        <p className="field-status" role="status">
          {status}
        </p>
      )}
    </section>
  );
}

function ordinal(n) {
  return ["first", "second", "third", "fourth", "fifth", "sixth"][n - 1] || `#${n}`;
}
