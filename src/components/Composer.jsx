import { useEffect, useId, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";

const MAX_HEIGHT = 220;
const isTouch = () => window.matchMedia("(pointer: coarse)").matches;

export default function Composer({ onSubmit, onStop, streaming, disabled, placeholder, autoFocus }) {
  const [value, setValue] = useState("");
  const textarea = useRef(null);
  const hintId = useId();

  useEffect(() => {
    // On phones focusing would pop the keyboard over the page; desktop only.
    if (autoFocus && !isTouch()) textarea.current?.focus();
  }, [autoFocus]);

  const resize = () => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  };

  const submit = (event) => {
    event?.preventDefault();
    const question = value.trim();
    if (!question || streaming || disabled) return;
    onSubmit(question);
    setValue("");
    requestAnimationFrame(() => {
      if (textarea.current) textarea.current.style.height = "auto";
    });
  };

  const onKeyDown = (event) => {
    // On touch keyboards Enter inserts a line break; the send button sends.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !isTouch()) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form className="composer" onSubmit={submit}>
      <label htmlFor={`${hintId}-input`} className="visually-hidden">
        Your question
      </label>
      <textarea
        id={`${hintId}-input`}
        ref={textarea}
        className="composer-input"
        rows={1}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-describedby={hintId}
        onChange={(event) => {
          setValue(event.target.value);
          resize();
        }}
        onKeyDown={onKeyDown}
      />
      <div className="composer-bar">
        <span id={hintId} className="composer-hint">
          Enter to send · Shift + Enter for a new line
        </span>
        {streaming ? (
          <button type="button" className="composer-send composer-send--stop" onClick={onStop} aria-label="Stop the answer">
            <Square size={14} strokeWidth={2.5} fill="currentColor" aria-hidden="true" />
          </button>
        ) : (
          <button type="submit" className="composer-send" disabled={disabled || !value.trim()} aria-label="Send question">
            <ArrowUp size={18} strokeWidth={2.25} aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  );
}
