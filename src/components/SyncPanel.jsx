import { useState } from "react";
import { CircleAlert, ExternalLink, RefreshCw } from "lucide-react";
import { useLibrary } from "../context/hooks";
import { errorMessage } from "../lib/api";
import { countLabel, googleApp, relativeTime } from "../lib/format";

const changeSummary = ({ added, removed }) => {
  const changed = Math.max(added, removed);
  return changed ? `${countLabel(changed, "passage")} re-indexed.` : "Re-indexed.";
};

// The state of a linked Google file: when it was last checked and re-indexed,
// any sync problem, and a way to check right now.
export default function SyncPanel({ doc, compact = false }) {
  const { syncDocument } = useLibrary();
  const [result, setResult] = useState(null); // { tone: "ok" | "error", text }

  const { source } = doc;
  const app = googleApp(source.googleType);
  const busy = Boolean(source.checking) || source.status === "syncing";
  const failed = source.status === "error";

  const syncNow = async () => {
    setResult(null);
    try {
      const data = await syncDocument(doc._id);
      if (data.outcome === "updated") setResult({ tone: "ok", text: `Found new edits. ${changeSummary(data)}` });
      else if (data.outcome === "unchanged") setResult({ tone: "ok", text: "No new edits since the last check." });
      // A failed check is shown from the document's own error below.
    } catch (err) {
      setResult({ tone: "error", text: errorMessage(err, "The file couldn't be checked.") });
    }
  };

  const state = busy ? "busy" : failed ? "error" : "ok";
  const checked = busy
    ? source.status === "syncing"
      ? "Re-indexing new edits…"
      : "Checking for edits…"
    : `Checked ${relativeTime(source.lastCheckedAt) || "recently"}`;

  return (
    <section className={`sync-panel${compact ? " sync-panel--compact" : ""}`} aria-label={`Sync with ${app}`}>
      <div className="sync-panel-main">
        <span className={`sync-dot sync-dot--${state}`} aria-hidden="true" />
        <div className="sync-panel-text">
          <p className="sync-title">Linked to {app}</p>
          <p className="sync-meta" role="status">
            {checked}
            {source.lastSyncedAt && <> · content updated {relativeTime(source.lastSyncedAt)}</>}
          </p>
        </div>
        <div className="sync-actions">
          <button type="button" className="btn btn-quiet btn-sm" onClick={syncNow} disabled={busy}>
            <RefreshCw size={15} strokeWidth={1.75} className={busy ? "is-spinning" : undefined} aria-hidden="true" />
            {busy ? "Checking…" : "Sync now"}
          </button>
          <a className="btn btn-quiet btn-sm" href={source.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={15} strokeWidth={1.75} aria-hidden="true" />
            <span>
              Open<span className="hide-sm"> in {app}</span>
            </span>
          </a>
        </div>
      </div>

      {failed && !busy && (
        <p className="sync-problem" role="alert">
          <CircleAlert size={15} strokeWidth={1.75} aria-hidden="true" />
          <span>
            {source.error}
            {source.lastSyncedAt && ` Answers use the version from ${relativeTime(source.lastSyncedAt)}.`}
          </span>
        </p>
      )}

      {result && !(failed && result.tone === "ok") && (
        <p className={`sync-result${result.tone === "error" ? " sync-result--error" : ""}`}>{result.text}</p>
      )}

      {!compact && (
        <p className="sync-help">
          Folio checks this file for edits every couple of minutes and again right before answering, so answers use
          what's in {app} now.
        </p>
      )}
    </section>
  );
}
