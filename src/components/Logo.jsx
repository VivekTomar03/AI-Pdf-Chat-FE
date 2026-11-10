import { APP_NAME } from "../config";

// A folded page with a margin note: the product is about reading documents.
export default function Logo({ compact = false }) {
  return (
    <span className="logo">
      <svg className="logo-mark" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
        <path d="M7 3.5h10.5L22 8v16.5H7z" className="logo-page" />
        <path d="M17.5 3.5V8H22" className="logo-fold" />
        <path d="M10.5 12.5h8M10.5 16h8M10.5 19.5h5" className="logo-lines" />
        <rect x="4" y="15" width="3" height="5.5" rx="0.5" className="logo-mark-accent" />
      </svg>
      {!compact && <span className="logo-word">{APP_NAME}</span>}
    </span>
  );
}
