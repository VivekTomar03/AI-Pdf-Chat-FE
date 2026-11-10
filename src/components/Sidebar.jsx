import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useMatch, useNavigate } from "react-router-dom";
import { CircleAlert, Link2, LogOut, Plus, Settings as SettingsIcon, Upload, X } from "lucide-react";
import { useAuth, useChat, useLibrary } from "../context/hooks";
import { ACCEPT_ATTRIBUTE } from "../config";
import { countLabel, documentSummary, isGoogleLinked } from "../lib/format";
import FileIcon from "./FileIcon";
import GoogleLinkForm from "./GoogleLinkForm";
import Logo from "./Logo";

const NESTED_CHAT_LIMIT = 5;

function UploadRow({ item, onDismiss }) {
  const failed = item.phase === "error";
  const working = item.phase === "indexing" || item.phase === "linking";
  return (
    <li className={`upload-row${failed ? " upload-row--error" : ""}`}>
      <div className="upload-row-head">
        {failed ? (
          <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <span className="spinner spinner--sm" aria-hidden="true" />
        )}
        <span className="upload-row-name" title={item.name}>
          {item.name}
        </span>
        {failed && (
          <button type="button" className="icon-btn icon-btn--sm" onClick={() => onDismiss(item.id)} aria-label={`Dismiss error for ${item.name}`}>
            <X size={15} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
      </div>
      {failed ? (
        <p className="upload-row-error" role="alert">
          {item.error}
        </p>
      ) : (
        <>
          <div className="progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${working ? 1 : Math.max(item.progress, 0.04)})` }} />
          </div>
          <p className="upload-row-phase" role="status">
            {item.phase === "linking"
              ? "Reading from Google and indexing…"
              : item.phase === "indexing"
                ? "Reading and indexing…"
                : `Uploading ${Math.round(item.progress * 100)}%`}
          </p>
        </>
      )}
    </li>
  );
}

// Chats for the document that is currently open, nested under it.
function NestedChats({ scope, basePath, onNavigate }) {
  const { lists, loadList } = useChat();

  useEffect(() => {
    loadList(scope);
  }, [scope, loadList]);

  const items = lists[scope]?.items || [];

  return (
    <ul className="nested-chats">
      <li>
        <NavLink to={`${basePath}/new`} className="nested-link nested-link--new" onClick={onNavigate} end>
          <Plus size={14} strokeWidth={2} aria-hidden="true" />
          New chat
        </NavLink>
      </li>
      {items.slice(0, NESTED_CHAT_LIMIT).map((conversation) => (
        <li key={conversation._id}>
          <NavLink to={`${basePath}/c/${conversation._id}`} className="nested-link" onClick={onNavigate} title={conversation.title}>
            {conversation.title}
          </NavLink>
        </li>
      ))}
      {items.length > NESTED_CHAT_LIMIT && (
        <li>
          <Link to={basePath} className="nested-link nested-link--more" onClick={onNavigate}>
            All {items.length} chats
          </Link>
        </li>
      )}
    </ul>
  );
}

export default function Sidebar({ onNavigate, onClose }) {
  const { user, logout } = useAuth();
  const { documents, allDocuments, status, error, uploads, upload, dismissUpload, refresh } = useLibrary();
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const linkFormId = useId();

  const docMatch = useMatch("/app/d/:docId/*");
  const allMatch = useMatch("/app/all/*");
  const activeDocId = docMatch?.params.docId;

  const handleFiles = async (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    const created = await Promise.all(files.map((file) => upload(file)));
    const first = created.find(Boolean);
    if (files.length === 1 && first) {
      onNavigate();
      navigate(`/app/d/${first._id}/new`);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-head">
        <Link to="/app" className="sidebar-logo" onClick={onNavigate} aria-label="Library home">
          <Logo />
        </Link>
        <button type="button" className="icon-btn sidebar-close" onClick={onClose} aria-label="Close library">
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <div className="sidebar-upload">
        <div className="sidebar-add">
          <button type="button" className="btn btn-primary" onClick={() => fileInput.current?.click()}>
            <Upload size={16} strokeWidth={2} aria-hidden="true" />
            Add a file
          </button>
          <button
            type="button"
            className={`btn btn-quiet${linkOpen ? " is-pressed" : ""}`}
            onClick={() => setLinkOpen((open) => !open)}
            aria-expanded={linkOpen}
            aria-controls={linkFormId}
            title="Link a Google Sheet or Doc"
          >
            <Link2 size={16} strokeWidth={1.75} aria-hidden="true" />
            Link
          </button>
        </div>
        {linkOpen ? (
          <div id={linkFormId} className="sidebar-link">
            <GoogleLinkForm
              compact
              autoFocus
              onLinked={(doc) => {
                setLinkOpen(false);
                onNavigate();
                navigate(`/app/d/${doc._id}/new`);
              }}
              onNavigate={() => {
                setLinkOpen(false);
                onNavigate();
              }}
            />
          </div>
        ) : (
          <p className="sidebar-hint">PDF, Excel or CSV up to 20 MB, or a Google Sheet or Doc</p>
        )}
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          multiple
          className="visually-hidden"
          tabIndex={-1}
          onChange={handleFiles}
        />
      </div>

      <nav className="sidebar-nav" aria-label="Documents">
        {uploads.length > 0 && (
          <ul className="upload-list" aria-label="Uploads">
            {uploads.map((item) => (
              <UploadRow key={item.id} item={item} onDismiss={dismissUpload} />
            ))}
          </ul>
        )}

        {documents.length > 0 && (
          <div className="nav-group">
            <NavLink to="/app/all" className="doc-link" onClick={onNavigate} end>
              <FileIcon type="all" />
              <span className="doc-link-text">
                <span className="doc-link-name">All documents</span>
                <span className="doc-link-meta">Search across {countLabel(documents.length, "file")}</span>
              </span>
              {allDocuments.conversationCount > 0 && (
                <span className="count" aria-label={`${allDocuments.conversationCount} chats`}>
                  {allDocuments.conversationCount}
                </span>
              )}
            </NavLink>
            {allMatch && <NestedChats scope="all" basePath="/app/all" onNavigate={onNavigate} />}
          </div>
        )}

        <h2 className="nav-heading">
          Library <span className="nav-heading-count">{status === "ready" ? documents.length : ""}</span>
        </h2>

        {status === "loading" && (
          <ul className="doc-skeletons" aria-label="Loading documents">
            {[0, 1, 2].map((i) => (
              <li key={i} className="skeleton skeleton--row" />
            ))}
          </ul>
        )}

        {status === "error" && (
          <div className="sidebar-error" role="alert">
            <p>{error}</p>
            <button type="button" className="btn btn-quiet btn-sm" onClick={refresh}>
              Retry
            </button>
          </div>
        )}

        {status === "ready" && documents.length === 0 && uploads.length === 0 && (
          <p className="sidebar-empty">Files you add appear here. Each one keeps its own chat history.</p>
        )}

        <ul className="doc-list">
          {documents.map((doc) => (
            <li key={doc._id}>
              <NavLink to={`/app/d/${doc._id}`} className="doc-link" onClick={onNavigate} end>
                <FileIcon type={doc.fileType} />
                <span className="doc-link-text">
                  <span className="doc-link-name" title={doc.name}>
                    {doc.name}
                  </span>
                  {isGoogleLinked(doc) && doc.source.status === "error" ? (
                    <span className="doc-link-meta doc-link-meta--error">Couldn't sync</span>
                  ) : (
                    <span className="doc-link-meta">{documentSummary(doc)}</span>
                  )}
                </span>
                {doc.conversationCount > 0 && (
                  <span className="count" aria-label={`${doc.conversationCount} chats`}>
                    {doc.conversationCount}
                  </span>
                )}
              </NavLink>
              {activeDocId === doc._id && (
                <NestedChats scope={doc._id} basePath={`/app/d/${doc._id}`} onNavigate={onNavigate} />
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-foot">
        <span className="sidebar-user" title={user?.email}>
          {user?.email}
        </span>
        <div className="sidebar-foot-actions">
          <NavLink to="/app/settings" className="icon-btn" onClick={onNavigate} aria-label="Settings">
            <SettingsIcon size={18} strokeWidth={1.75} aria-hidden="true" />
          </NavLink>
          <button type="button" className="icon-btn" onClick={logout} aria-label="Sign out">
            <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
