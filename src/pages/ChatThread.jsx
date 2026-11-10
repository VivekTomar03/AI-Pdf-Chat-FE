import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, CircleAlert, Plus, Trash2 } from "lucide-react";
import { useChat, useLibrary } from "../context/hooks";
import { errorMessage } from "../lib/api";
import { countLabel, documentSummary, isGoogleLinked, scopePath } from "../lib/format";
import useDocumentTitle from "../lib/useDocumentTitle";
import Composer from "../components/Composer";
import FileIcon from "../components/FileIcon";
import Turn from "../components/Turn";
import SyncPanel from "../components/SyncPanel";

const STARTERS = {
  pdf: [
    "Summarise this document in five points",
    "What dates, deadlines or amounts does it mention?",
    "What does it say about responsibilities or obligations?",
  ],
  spreadsheet: [
    "What does this spreadsheet track?",
    "Which columns does it have, and what do they contain?",
    "Which rows have the highest values?",
  ],
  document: [
    "Summarise this document in five points",
    "What are the main findings or conclusions?",
    "How was the work done, and what are its limitations?",
  ],
  all: [
    "Give me a one-line summary of each file",
    "Which files mention dates or deadlines?",
    "Where do my files disagree with each other?",
  ],
};

const STICK_THRESHOLD = 96;

// Pairs each question with the answer that follows it.
const toTurns = (messages) => {
  const turns = [];
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (message.role !== "user") continue;
    const next = messages[i + 1];
    const answer = next?.role === "assistant" ? next : null;
    turns.push({ question: message, answer });
    if (answer) i++;
  }
  return turns;
};

function ThreadView({ docId, chatId }) {
  const scope = docId ?? "all";
  const basePath = scopePath(scope);
  const navigate = useNavigate();

  const { documents, status: libraryStatus } = useLibrary();
  const { threads, streaming, loadThread, send, startConversation, retry, stop, deleteConversation } = useChat();

  const [pendingQuestion, setPendingQuestion] = useState("");
  const [error, setError] = useState("");
  const scroller = useRef(null);
  const stickToBottom = useRef(true);

  const doc = docId ? documents.find((item) => item._id === docId) : null;
  // Questions about linked Google files wait for a quick check for edits first.
  const checksGoogle = doc ? isGoogleLinked(doc) : documents.some(isGoogleLinked);
  const thread = chatId ? threads[chatId] : null;
  const isStreaming = chatId ? Boolean(streaming[chatId]) : false;
  const messages = thread?.messages || [];
  const lastLength = (messages.at(-1)?.content?.length || 0) + (messages.at(-1)?.thought?.length || 0);

  useDocumentTitle(chatId ? thread?.conversation?.title || "Chat" : "New chat");

  useEffect(() => {
    if (chatId) loadThread(chatId);
  }, [chatId, loadThread]);

  // Follow the answer as it streams, unless the reader has scrolled up.
  useEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, lastLength, thread?.status, pendingQuestion]);

  if (libraryStatus === "loading") {
    return (
      <div className="thread" aria-busy="true">
        <div className="thread-scroll">
          <div className="thread-column">
            <div className="skeleton skeleton--title" />
            <div className="skeleton skeleton--block" />
          </div>
        </div>
      </div>
    );
  }

  if (docId && !doc) {
    return (
      <div className="page page--narrow">
        <h1 className="page-title">This file isn't in your library</h1>
        <p className="lede">It may have been deleted, along with its chats.</p>
        <Link to="/app" className="btn btn-primary">
          Back to your library
        </Link>
      </div>
    );
  }

  if (thread?.status === "error") {
    const missing = thread.error === "missing";
    return (
      <div className="page page--narrow">
        <h1 className="page-title">{missing ? "This chat doesn't exist" : "This chat couldn't be loaded"}</h1>
        <p className="lede">
          {missing ? "It may have been deleted." : "Check your connection and try again."}
        </p>
        <div className="button-row">
          {!missing && (
            <button type="button" className="btn btn-primary" onClick={() => loadThread(chatId)}>
              Try again
            </button>
          )}
          <Link to={`${basePath}/new`} className="btn btn-quiet">
            Start a new chat
          </Link>
        </div>
      </div>
    );
  }

  // A saved link can point at the right chat under the wrong document.
  if (thread?.conversation) {
    const actualScope = thread.conversation.documentId ? String(thread.conversation.documentId) : "all";
    if (actualScope !== scope) return <Navigate to={`${scopePath(actualScope)}/c/${chatId}`} replace />;
  }

  const submit = async (question) => {
    stickToBottom.current = true;
    setError("");
    if (chatId) {
      send(chatId, question, scope);
      return;
    }
    setPendingQuestion(question);
    try {
      const id = await startConversation(scope, question);
      navigate(`${basePath}/c/${id}`, { replace: true });
    } catch (err) {
      setPendingQuestion("");
      setError(errorMessage(err, "The chat could not be started."));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this chat? This can't be undone.")) return;
    try {
      await deleteConversation(chatId, scope);
      navigate(basePath, { replace: true });
    } catch (err) {
      setError(errorMessage(err, "The chat could not be deleted."));
    }
  };

  const turns = toTurns(messages);
  if (pendingQuestion) {
    turns.push({
      question: { _id: "pending", content: pendingQuestion },
      answer: { _id: "pending-answer", status: "streaming", content: "", sources: [] },
    });
  }

  const loading = chatId && (!thread || thread.status === "loading") && !messages.length;
  const fileType = doc?.fileType || "all";
  const title = chatId ? thread?.conversation?.title || "" : "New chat";

  return (
    <div className="thread">
      <header className="thread-head">
        <div className="thread-head-inner">
          <Link to={basePath} className="thread-crumb">
            <FileIcon type={fileType} size={15} />
            <span>{doc ? doc.name : "All documents"}</span>
          </Link>
          <div className="thread-head-row">
            <h1 className="thread-title" title={title}>
              {title}
            </h1>
            {chatId && (
              <div className="thread-actions">
                <Link to={`${basePath}/new`} className="btn btn-quiet btn-sm">
                  <Plus size={15} strokeWidth={2} aria-hidden="true" />
                  <span className="hide-sm">New chat</span>
                </Link>
                <button type="button" className="icon-btn" onClick={handleDelete} aria-label="Delete this chat">
                  <Trash2 size={17} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div
        className="thread-scroll"
        ref={scroller}
        onScroll={(event) => {
          const el = event.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD;
        }}
      >
        <div className="thread-column">
          {loading && (
            <div aria-busy="true">
              <div className="skeleton skeleton--title" />
              <div className="skeleton skeleton--block" />
            </div>
          )}

          {!loading && turns.length === 0 && (
            <div className="thread-intro">
              <p className="eyebrow">{doc ? documentSummary(doc) : `Searches ${countLabel(documents.length, "file")}`}</p>
              <h2 className="thread-intro-title">
                {doc ? (
                  <>
                    Ask about <span className="thread-intro-name">{doc.name}</span>
                  </>
                ) : (
                  "Ask across your whole library"
                )}
              </h2>
              <p className="lede">
                Every answer cites the{" "}
                {fileType === "spreadsheet"
                  ? "sheet and rows"
                  : fileType === "pdf"
                    ? "page"
                    : fileType === "document"
                      ? "section"
                      : "file and location"}{" "}
                it
                comes from. Follow-up questions keep the context of this chat, and the chat is saved so you can come back to it.
              </p>
              {isGoogleLinked(doc) && <SyncPanel doc={doc} compact />}
              <div className="starters">
                <p className="section-label">Try asking</p>
                <ul>
                  {STARTERS[fileType].map((starter) => (
                    <li key={starter}>
                      <button type="button" className="starter" onClick={() => submit(starter)} disabled={Boolean(pendingQuestion)}>
                        <span>{starter}</span>
                        <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {turns.map((turn) => (
            <Turn
              key={turn.question._id}
              question={turn.question}
              answer={turn.answer}
              acrossDocuments={scope === "all"}
              checksGoogle={checksGoogle}
              onRetry={chatId ? (answer, question) => retry(chatId, answer, question, scope) : undefined}
            />
          ))}
        </div>
      </div>

      <div className="thread-foot">
        <div className="thread-column">
          {error && (
            <p className="form-error" role="alert">
              <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
              {error}
            </p>
          )}
          <Composer
            onSubmit={submit}
            onStop={() => stop(chatId)}
            streaming={isStreaming}
            disabled={Boolean(pendingQuestion) || Boolean(loading)}
            placeholder={doc ? "Ask a question about this file…" : "Ask a question about any of your files…"}
            autoFocus
          />
          <p className="thread-disclaimer">Answers come only from your files, but can still be wrong. Check the cited sources.</p>
        </div>
      </div>
    </div>
  );
}

// Keyed by chat so moving from /new to the created chat (or between chats)
// starts with fresh local state.
export default function ChatThread() {
  const { docId, chatId } = useParams();
  return <ThreadView key={chatId ?? `new-${docId ?? "all"}`} docId={docId} chatId={chatId} />;
}
