import { useId, useRef, useState } from "react";
import { ChevronRight, CircleAlert, KeyRound, RefreshCw } from "lucide-react";
import Markdown from "./Markdown";
import CopyButton from "./CopyButton";
import { useAuth } from "../context/hooks";
import { countLabel, googleApp, relativeTime, sourceLocation } from "../lib/format";
import { describeKeyRef, getGeminiKeys } from "../lib/geminiKey";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// "Key 1 (Personal) reached its limit, so key 2 took over."
const CARRY_OVER = {
  streaming: "It is continuing with the same chat history and sources.",
  error: "Each key was given the same chat history and sources.",
};

function KeySwitchNote({ fallbacks, status }) {
  const { user } = useAuth();
  const keys = getGeminiKeys(user?.id);

  const sentences = fallbacks.map(({ from, to, reason }) => {
    const what = reason === "rejected" ? "was rejected" : "reached its limit";
    return `${capitalise(describeKeyRef(from, keys))} ${what}, so ${describeKeyRef(to, keys)} took over.`;
  });

  return (
    <p className="answer-note answer-note--switch">
      <KeyRound size={14} strokeWidth={1.75} aria-hidden="true" />
      <span>
        {sentences.join(" ")} {CARRY_OVER[status] || "It continued with the same chat history and sources."}
      </span>
    </p>
  );
}

// What happened when linked Google files were checked just before answering.
// "No new edits" is the usual case and is not mentioned.
function SyncNote({ note }) {
  const name = `“${note.documentName}”`;
  const since = note.lastSyncedAt ? ` from ${relativeTime(note.lastSyncedAt)}` : "";

  if (note.outcome === "updated") {
    const changed = Math.max(note.added || 0, note.removed || 0);
    return (
      <p className="answer-note answer-note--switch">
        <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />
        <span>
          {name} had new edits in {googleApp(note.googleType)}, so {changed ? countLabel(changed, "passage") : "it"} was
          re-indexed before this answer.
        </span>
      </p>
    );
  }

  if (note.outcome === "pending") {
    return (
      <p className="answer-note answer-note--switch">
        <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />
        <span>
          {name} has new edits that are still being indexed, so this answer uses the previous version{since}.
        </span>
      </p>
    );
  }

  return (
    <p className="answer-note answer-note--switch answer-note--warn">
      <CircleAlert size={14} strokeWidth={1.75} aria-hidden="true" />
      <span>
        Couldn't check {name} for edits. {note.message} This answer uses the version{since || " indexed earlier"}.
      </span>
    </p>
  );
}

// Beyond this many sources (a small file sends every passage) the chip row
// shows the first few and a count; the full list is one click away.
const MAX_CHIPS = 8;
const CHIPS_WHEN_CAPPED = 6;

function Sources({ sources, open, activeIndex, acrossDocuments, onSelect, onOpen, registerRef, listId }) {
  if (!open) {
    const capped = sources.length > MAX_CHIPS;
    const shown = capped ? sources.slice(0, CHIPS_WHEN_CAPPED) : sources;
    return (
      <ul className="source-chips" aria-label="Sources">
        {shown.map((source) => (
          <li key={source.index}>
            <button
              type="button"
              className="source-chip"
              onClick={() => onSelect(source.index)}
              title={sourceLocation(source, { full: true })}
            >
              <span className="source-chip-n">{source.index}</span>
              {sourceLocation(source)}
            </button>
          </li>
        ))}
        {capped && (
          <li>
            <button type="button" className="source-chip source-chip--more" onClick={onOpen}>
              +{sources.length - shown.length} more
            </button>
          </li>
        )}
      </ul>
    );
  }

  return (
    <ol className="source-list" id={listId}>
      {sources.map((source) => (
        <li
          key={source.index}
          ref={(el) => registerRef(source.index, el)}
          className={`source${activeIndex === source.index ? " is-active" : ""}`}
        >
          <div className="source-head">
            <span className="source-n">{source.index}</span>
            <span className="source-where">{sourceLocation(source, { full: true })}</span>
            {acrossDocuments && (
              <span className="source-doc" title={source.documentName}>
                {source.documentName}
              </span>
            )}
            <CopyButton text={source.text} label={`Copy source ${source.index}`} compact />
          </div>
          <blockquote className="source-text">{source.text}</blockquote>
        </li>
      ))}
    </ol>
  );
}

// One question and its answer, laid out like a page of notes rather than a
// pair of chat bubbles.
export default function Turn({ question, answer, acrossDocuments, checksGoogle = false, onRetry }) {
  const id = useId();
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [activeSource, setActiveSource] = useState(null);
  // null = automatic: open while the model is thinking, closed once it answers.
  const [reasoningChoice, setReasoningChoice] = useState(null);
  const sourceElements = useRef(new Map());

  const streaming = answer?.status === "streaming";
  const sources = answer?.sources || [];
  const hasReasoning = Boolean(answer?.thought || answer?.searchQuery);
  const reasoningOpen = reasoningChoice ?? (streaming && !answer?.content);

  const registerRef = (index, el) => {
    if (el) sourceElements.current.set(index, el);
    else sourceElements.current.delete(index);
  };

  const showSource = (index) => {
    setSourcesOpen(true);
    setActiveSource(index);
    requestAnimationFrame(() =>
      sourceElements.current
        .get(index)
        ?.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" })
    );
  };

  return (
    <article className="turn">
      <h2 className="turn-question">{question.content}</h2>

      {answer && (
        <section className="turn-answer" aria-label="Answer" aria-busy={streaming}>
          {answer.syncNotes?.map((note) => <SyncNote key={String(note.documentId)} note={note} />)}

          {streaming && !answer.content && (
            <p className="answer-status" role="status">
              <span className="pulse-dot" aria-hidden="true" />
              {sources.length
                ? `Reading ${countLabel(sources.length, "passage")}…`
                : checksGoogle && !answer.syncNotes?.length
                  ? "Checking linked Google files for edits, then searching…"
                  : "Searching your documents…"}
            </p>
          )}

          {answer.content && (
            <div className={`answer-body${streaming ? " is-streaming" : ""}`}>
              <Markdown text={answer.content} onCite={sources.length ? showSource : undefined} />
            </div>
          )}

          {answer.fallbacks?.length > 0 && <KeySwitchNote fallbacks={answer.fallbacks} status={answer.status} />}

          {answer.status === "stopped" && (
            <p className="answer-note">
              Stopped. {answer.content ? "The partial answer was saved." : "No answer was written."}
            </p>
          )}

          {answer.status === "error" && (
            <div className="answer-error" role="alert">
              <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>{answer.error || "The answer could not be completed."}</span>
              {onRetry && (
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => onRetry(answer, question.content)}>
                  Try again
                </button>
              )}
            </div>
          )}

          {(hasReasoning || sources.length > 0 || (answer.content && !streaming)) && (
            <div className="turn-tools">
              {hasReasoning && (
                <button
                  type="button"
                  className="tool-toggle"
                  aria-expanded={reasoningOpen}
                  aria-controls={`${id}-reasoning`}
                  onClick={() => setReasoningChoice(!reasoningOpen)}
                >
                  <ChevronRight size={15} strokeWidth={2} className="chev" aria-hidden="true" />
                  Reasoning
                </button>
              )}
              {sources.length > 0 && (
                <button
                  type="button"
                  className="tool-toggle"
                  aria-expanded={sourcesOpen}
                  aria-controls={`${id}-sources`}
                  onClick={() => setSourcesOpen(!sourcesOpen)}
                >
                  <ChevronRight size={15} strokeWidth={2} className="chev" aria-hidden="true" />
                  {countLabel(sources.length, "source")}
                </button>
              )}
              {answer.content && !streaming && <CopyButton text={answer.content} label="Copy answer" />}
            </div>
          )}

          {hasReasoning && reasoningOpen && (
            <div className="reasoning" id={`${id}-reasoning`}>
              {answer.searchQuery && (
                <p className="reasoning-query">
                  Searched for <q>{answer.searchQuery}</q>
                </p>
              )}
              {answer.thought && <Markdown text={answer.thought} />}
            </div>
          )}

          {sources.length > 0 && (
            <Sources
              sources={sources}
              open={sourcesOpen}
              activeIndex={activeSource}
              acrossDocuments={acrossDocuments}
              onSelect={showSource}
              onOpen={() => setSourcesOpen(true)}
              registerRef={registerRef}
              listId={`${id}-sources`}
            />
          )}
        </section>
      )}
    </article>
  );
}
