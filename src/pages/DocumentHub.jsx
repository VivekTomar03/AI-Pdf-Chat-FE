import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CircleAlert, History, Plus, Trash2 } from "lucide-react";
import { useChat, useLibrary } from "../context/hooks";
import { errorMessage } from "../lib/api";
import {
  countLabel,
  documentSummary,
  formatBytes,
  googleApp,
  isGoogleLinked,
  relativeTime,
  scopePath,
  shortDate,
} from "../lib/format";
import useDocumentTitle from "../lib/useDocumentTitle";
import FileIcon from "../components/FileIcon";
import SyncPanel from "../components/SyncPanel";

function HubSkeleton() {
  return (
    <div className="page" aria-busy="true">
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--line" />
      <div className="choice-grid">
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
      </div>
    </div>
  );
}

function MissingDocument() {
  return (
    <div className="page page--narrow">
      <p className="eyebrow">Not found</p>
      <h1 className="page-title">This file isn't in your library</h1>
      <p className="lede">It may have been deleted, or the link belongs to another account.</p>
      <Link to="/app" className="btn btn-primary">
        Back to your library
      </Link>
    </div>
  );
}

// /app/d/:docId and /app/all — choose between continuing a saved chat and
// starting a new one. With no saved chats there is no choice to make, so it
// goes straight to a new chat.
export default function DocumentHub() {
  const { docId } = useParams();
  const scope = docId ?? "all";
  const basePath = scopePath(scope);
  const navigate = useNavigate();

  const { documents, status: libraryStatus, removeDocument } = useLibrary();
  const { lists, loadList, deleteConversation, forgetDocument } = useChat();
  const [actionError, setActionError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const doc = docId ? documents.find((item) => item._id === docId) : null;
  const linked = isGoogleLinked(doc);
  useDocumentTitle(docId ? doc?.name : "All documents");

  // The scope whose chat list has been re-read since this page opened. A cached
  // list can be out of date (a chat started elsewhere), so "no chats, go
  // straight to a new one" waits for a fresh read.
  const [freshScope, setFreshScope] = useState(null);
  useEffect(() => {
    loadList(scope).then(() => setFreshScope(scope));
  }, [scope, loadList]);

  const list = lists[scope];

  if (libraryStatus === "loading") return <HubSkeleton />;
  if (docId && !doc) return <MissingDocument />;
  if (!docId && documents.length === 0) return <Navigate to="/app" replace />;
  if (freshScope === scope && list?.status === "ready" && list.items.length === 0) return <Navigate to="new" replace />;

  const chats = list?.items || [];
  const latest = chats[0];

  const handleDeleteDocument = async () => {
    const chatNote = chats.length ? ` and ${countLabel(chats.length, "saved chat")}` : "";
    const question = linked
      ? `Remove “${doc.name}”${chatNote} from Folio? The file in ${googleApp(doc.source.googleType)} isn't touched.`
      : `Delete “${doc.name}”${chatNote}? This can't be undone.`;
    if (!window.confirm(question)) return;
    setDeleting(true);
    setActionError("");
    try {
      await removeDocument(doc._id);
      forgetDocument(doc._id);
      navigate("/app", { replace: true });
    } catch (err) {
      setActionError(errorMessage(err, "The file could not be deleted."));
      setDeleting(false);
    }
  };

  const handleDeleteChat = async (conversation) => {
    if (!window.confirm(`Delete the chat “${conversation.title}”?`)) return;
    setActionError("");
    try {
      await deleteConversation(conversation._id, scope);
    } catch (err) {
      setActionError(errorMessage(err, "The chat could not be deleted."));
    }
  };

  return (
    <div className="page">
      <Link to="/app" className="back-link">
        <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
        Library
      </Link>

      <header className="hub-head">
        <span className="hub-icon" aria-hidden="true">
          <FileIcon type={doc?.fileType || "all"} size={22} />
        </span>
        <div className="hub-head-text">
          <p className="eyebrow">
            {doc
              ? [documentSummary(doc), formatBytes(doc.size)].filter(Boolean).join(" · ")
              : `Searches ${countLabel(documents.length, "file")}`}
          </p>
          <h1 className="page-title page-title--doc">{doc ? doc.name : "All documents"}</h1>
          <p className="hub-meta">
            {doc
              ? `${linked ? "Linked" : "Added"} ${shortDate(doc.createdAt)}${doc.chunkCount ? ` · indexed as ${countLabel(doc.chunkCount, "passage")}` : ""}`
              : "Questions here are answered from whichever of your files is most relevant."}
          </p>
          {doc?.fileType === "spreadsheet" && doc.sheets.length > 0 && (
            <ul className="sheet-list" aria-label="Sheets">
              {doc.sheets.map((sheet) => (
                <li key={sheet.name}>
                  <span className="sheet-name">{sheet.name}</span>
                  {countLabel(sheet.rows, "row")} × {countLabel(sheet.columns, "column")}
                </li>
              ))}
            </ul>
          )}
          {doc?.truncated && (
            <p className="inline-warning">
              <CircleAlert size={15} strokeWidth={1.75} aria-hidden="true" />
              Only the first 5,000 rows of each sheet were indexed.
            </p>
          )}
        </div>
        {doc && (
          <button type="button" className="btn btn-quiet btn-danger" onClick={handleDeleteDocument} disabled={deleting}>
            <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
            {deleting ? "Removing…" : linked ? "Remove" : "Delete file"}
          </button>
        )}
      </header>

      {linked && <SyncPanel doc={doc} />}

      {actionError && (
        <p className="form-error" role="alert">
          <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
          {actionError}
        </p>
      )}

      {!list || (!list.items.length && (list.status !== "ready" || freshScope !== scope)) ? (
        list?.status === "error" ? (
          <div className="form-error" role="alert">
            <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
            Your chats could not be loaded.
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => loadList(scope)}>
              Retry
            </button>
          </div>
        ) : (
          <div className="choice-grid" aria-busy="true">
            <div className="skeleton skeleton--card" />
            <div className="skeleton skeleton--card" />
          </div>
        )
      ) : (
        <>
          <section className="hub-section" aria-labelledby="hub-choose">
            <h2 id="hub-choose" className="section-label">
              {doc ? "You've chatted about this file before" : "You've searched your library before"}
            </h2>
            <div className="choice-grid">
              <Link to="new" className="choice choice--primary">
                <span className="choice-icon" aria-hidden="true">
                  <Plus size={18} strokeWidth={2} />
                </span>
                <span className="choice-title">Start a new chat</span>
                <span className="choice-sub">A clean thread with no earlier context. Your saved chats stay as they are.</span>
              </Link>
              {latest && (
                <Link to={`c/${latest._id}`} className="choice">
                  <span className="choice-icon" aria-hidden="true">
                    <History size={18} strokeWidth={1.75} />
                  </span>
                  <span className="choice-title">Continue where you left off</span>
                  <span className="choice-sub">
                    <span className="choice-quote">{latest.title}</span> · {relativeTime(latest.lastMessageAt)}
                  </span>
                </Link>
              )}
            </div>
          </section>

          <section className="hub-section" aria-labelledby="hub-history">
            <h2 id="hub-history" className="section-label">
              Saved chats <span className="count">{chats.length}</span>
            </h2>
            <ul className="chat-rows">
              {chats.map((conversation) => (
                <li key={conversation._id} className="chat-row">
                  <Link to={`${basePath}/c/${conversation._id}`} className="chat-row-link">
                    <span className="chat-row-title">{conversation.title}</span>
                    <span className="chat-row-meta">
                      {countLabel(Math.ceil(conversation.messageCount / 2), "question")} ·{" "}
                      {relativeTime(conversation.lastMessageAt)}
                    </span>
                  </Link>
                  <button
                    type="button"
                    className="icon-btn chat-row-delete"
                    onClick={() => handleDeleteChat(conversation)}
                    aria-label={`Delete the chat “${conversation.title}”`}
                  >
                    <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
