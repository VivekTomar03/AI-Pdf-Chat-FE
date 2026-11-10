import { useId, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Link2 } from "lucide-react";
import { useLibrary } from "../context/hooks";
import { googleLinkType } from "../lib/format";

// Adds a Google Sheet or Doc by its share link. The file must be shared as
// "Anyone with the link"; after that Folio keeps it in sync on its own.
export default function GoogleLinkForm({ onLinked, onNavigate, compact = false, autoFocus = false }) {
  const { linkGoogle } = useLibrary();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  // { message, documentId } — documentId when the file is already linked
  const [error, setError] = useState(null);
  const id = useId();

  const submit = async (event) => {
    event.preventDefault();
    const value = url.trim();
    if (!value) {
      setError({ message: "Paste a link to a Google Sheet or a Google Doc." });
      return;
    }
    if (!googleLinkType(value)) {
      setError({ message: "That isn't a Google Sheets or Google Docs link. It should start with docs.google.com." });
      return;
    }

    setBusy(true);
    setError(null);
    const result = await linkGoogle(value);
    setBusy(false);

    if (result.document) {
      setUrl("");
      onLinked?.(result.document);
    } else {
      setError({ message: result.error, documentId: result.documentId });
    }
  };

  return (
    <form className={`link-form${compact ? " link-form--compact" : ""}`} onSubmit={submit} noValidate>
      <label htmlFor={`${id}-url`} className="link-form-label">
        <Link2 size={16} strokeWidth={1.75} aria-hidden="true" />
        {compact ? "Google Sheet or Doc link" : "Link a Google Sheet or Google Doc"}
      </label>
      <div className="link-form-row">
        <input
          id={`${id}-url`}
          type="url"
          inputMode="url"
          className="input"
          placeholder="https://docs.google.com/…"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            if (error) setError(null);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-note`}
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          readOnly={busy}
        />
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy && <span className="spinner spinner--sm spinner--inverse" aria-hidden="true" />}
          {busy ? "Linking…" : "Link"}
        </button>
      </div>
      {error ? (
        <p id={`${id}-note`} className="field-error" role="alert">
          {error.message}{" "}
          {error.documentId && (
            <RouterLink to={`/app/d/${error.documentId}`} onClick={onNavigate}>
              Open it
            </RouterLink>
          )}
        </p>
      ) : (
        <p id={`${id}-note`} className="field-help">
          {busy
            ? "Reading the file from Google and indexing it…"
            : compact
              ? "Share it as “Anyone with the link” first."
              : "Share the file as “Anyone with the link” first. Edits made in Google are picked up automatically."}
        </p>
      )}
    </form>
  );
}
