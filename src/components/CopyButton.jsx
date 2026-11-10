import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyButton({ text, label = "Copy", compact = false }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked (insecure origin, permissions); fail quietly.
    }
  };

  return (
    <button
      type="button"
      className={compact ? "icon-btn icon-btn--sm" : "tool-toggle"}
      onClick={copy}
      aria-label={compact ? (copied ? "Copied" : label) : undefined}
    >
      {copied ? (
        <Check size={compact ? 14 : 15} strokeWidth={2} aria-hidden="true" />
      ) : (
        <Copy size={compact ? 14 : 15} strokeWidth={1.75} aria-hidden="true" />
      )}
      {!compact && <span>{copied ? "Copied" : label}</span>}
      <span className="visually-hidden" role="status">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}
