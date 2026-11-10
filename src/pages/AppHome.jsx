import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useChat, useLibrary } from "../context/hooks";
import { countLabel, documentSummary, formatBytes, isGoogleLinked, relativeTime, scopePath, shortDate } from "../lib/format";
import useDocumentTitle from "../lib/useDocumentTitle";
import FileIcon from "../components/FileIcon";
import UploadZone from "../components/UploadZone";
import GoogleLinkForm from "../components/GoogleLinkForm";

// Two ways in: a file from this device, or a Google file kept in sync.
function AddFile({ onAdded }) {
  return (
    <div className="add-file">
      <UploadZone onUploaded={onAdded} />
      <p className="or-rule">
        <span>or</span>
      </p>
      <GoogleLinkForm onLinked={onAdded} />
    </div>
  );
}

function Onboarding({ onUploaded }) {
  return (
    <div className="page page--narrow">
      <p className="eyebrow">Getting started</p>
      <h1 className="page-title">Add your first file</h1>
      <p className="lede">
        Upload a PDF or a spreadsheet, or link a Google Sheet or Doc. Once it's indexed you can ask questions about it in
        plain language, and every chat about it is saved so you can return to it later.
      </p>
      <AddFile onAdded={onUploaded} />
      <ol className="steps">
        <li>
          <span className="steps-n">1</span>
          <div>
            <p className="steps-title">Add</p>
            <p className="steps-text">Each file is read and indexed for search. Linked Google files are re-read when they change.</p>
          </div>
        </li>
        <li>
          <span className="steps-n">2</span>
          <div>
            <p className="steps-title">Ask</p>
            <p className="steps-text">Ask anything about the file. Follow-up questions remember the conversation.</p>
          </div>
        </li>
        <li>
          <span className="steps-n">3</span>
          <div>
            <p className="steps-title">Check</p>
            <p className="steps-text">Each answer cites the page or rows it used, so you can verify it.</p>
          </div>
        </li>
      </ol>
    </div>
  );
}

// /app — recent chats, the upload area, and the file list.
export default function AppHome() {
  useDocumentTitle("Library");
  const navigate = useNavigate();
  const { documents, status } = useLibrary();
  const { lists, loadList } = useChat();

  useEffect(() => {
    loadList("recent");
  }, [loadList]);

  const openNewChat = (doc) => navigate(`/app/d/${doc._id}/new`);

  if (status === "loading") {
    return (
      <div className="page" aria-busy="true">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--card" />
      </div>
    );
  }

  if (status === "ready" && documents.length === 0) return <Onboarding onUploaded={openNewChat} />;

  const recent = lists.recent?.items || [];
  const totalChats = documents.reduce((sum, doc) => sum + doc.conversationCount, 0);

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">
          {countLabel(documents.length, "file")} · {countLabel(totalChats, "saved chat")}
        </p>
        <h1 className="page-title">Library</h1>
      </header>

      {recent.length > 0 && (
        <section className="home-section" aria-labelledby="home-recent">
          <h2 id="home-recent" className="section-label">
            Continue a chat
          </h2>
          <ul className="recent-list">
            {recent.map((conversation) => {
              const scope = conversation.documentId ? String(conversation.documentId) : "all";
              return (
                <li key={conversation._id}>
                  <Link to={`${scopePath(scope)}/c/${conversation._id}`} className="recent-item">
                    <FileIcon type={conversation.documentType || "all"} size={17} />
                    <span className="recent-text">
                      <span className="recent-title">{conversation.title}</span>
                      <span className="recent-meta">
                        {conversation.documentName || "All documents"} · {relativeTime(conversation.lastMessageAt)}
                      </span>
                    </span>
                    <ArrowRight size={16} strokeWidth={1.75} className="recent-arrow" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="home-section" aria-labelledby="home-add">
        <h2 id="home-add" className="section-label">
          Add a file
        </h2>
        <AddFile onAdded={openNewChat} />
      </section>

      <section className="home-section" aria-labelledby="home-files">
        <h2 id="home-files" className="section-label">
          Files
        </h2>
        <table className="file-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Type</th>
              <th scope="col" className="num">
                Size
              </th>
              <th scope="col" className="num">
                Chats
              </th>
              <th scope="col">Added</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc._id}>
                <td>
                  <Link to={`/app/d/${doc._id}`} className="file-table-name">
                    <FileIcon type={doc.fileType} size={17} />
                    <span>{doc.name}</span>
                  </Link>
                </td>
                <td data-label="Type">
                  {documentSummary(doc)}
                  {isGoogleLinked(doc) && doc.source.status === "error" && (
                    <span className="file-table-flag"> · couldn't sync</span>
                  )}
                </td>
                <td data-label="Size" className="num">
                  {formatBytes(doc.size) || "—"}
                </td>
                <td data-label="Chats" className="num">
                  {doc.conversationCount}
                </td>
                <td data-label="Added">{shortDate(doc.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
