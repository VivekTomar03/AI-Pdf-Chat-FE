import { ACCEPTED_EXTENSIONS, MAX_UPLOAD_MB } from "../config";

export const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const UNITS = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export const relativeTime = (value) => {
  if (!value) return "";
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return relativeFormatter.format(Math.round(seconds / size), unit);
    }
  }
  return "just now";
};

export const shortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "";

export const fileTypeLabel = (doc) => (doc?.extension || ".pdf").replace(".", "").toUpperCase();

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

// Files linked from Google rather than uploaded.
export const isGoogleLinked = (doc) => doc?.source?.kind === "google";
export const googleLabel = (type) => (type === "doc" ? "Google Doc" : "Google Sheet");
export const googleApp = (type) => (type === "doc" ? "Google Docs" : "Google Sheets");

// "sheet" or "doc" for a docs.google.com link, otherwise null. The server does
// the full check; this only catches links that are obviously something else.
export const googleLinkType = (text) => {
  const match = String(text || "").match(/docs\.google\.com\/(?:a\/[^/]+\/)?(spreadsheets|document)\//i);
  if (!match) return null;
  return match[1].toLowerCase() === "spreadsheets" ? "sheet" : "doc";
};

// "PDF · 12 pages", "XLSX · 2 sheets", "Google Doc · 6 sections"
export const documentSummary = (doc) => {
  if (!doc) return "";
  if (isGoogleLinked(doc)) {
    const type = doc.source.googleType;
    if (type === "doc") {
      return `${googleLabel(type)} · ${doc.sectionCount ? plural(doc.sectionCount, "section") : plural(doc.wordCount || 0, "word")}`;
    }
    return `${googleLabel(type)} · ${plural(doc.sheets?.length || 0, "sheet")}`;
  }
  if (doc.fileType === "spreadsheet") {
    const sheets = doc.sheets?.length || 0;
    return `${fileTypeLabel(doc)} · ${plural(sheets, "sheet")}`;
  }
  return doc.pageCount ? `PDF · ${plural(doc.pageCount, "page")}` : "PDF";
};

// Where a citation came from, short enough for a chip.
export const sourceLocation = (source, { full = false } = {}) => {
  if (source.sheetName) {
    // Sheet overview chunks carry no row range.
    if (!source.rowStart) return `${source.sheetName} · overview`;
    if (source.rowEnd && source.rowStart !== source.rowEnd) {
      return `${source.sheetName} · rows ${source.rowStart}–${source.rowEnd}`;
    }
    return `${source.sheetName} · row ${source.rowStart}`;
  }
  if (source.pageNumber) return `p. ${source.pageNumber}`;
  // Doc sections carry their whole heading path ("Paper title › 3. Method ›
  // 3.2 Procedure"); a chip shows only the nearest heading.
  if (source.section) return `§ ${full ? source.section : source.section.split(" › ").at(-1)}`;
  return "excerpt";
};

export const countLabel = plural;

// Mirrors the server's checks so most bad files are rejected before upload.
export const validateFile = (file) => {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return "Only PDF, Excel (.xlsx, .xls) and CSV files are supported.";
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `That file is larger than ${MAX_UPLOAD_MB} MB.`;
  }
  return null;
};

export const scopePath = (scope) => (scope === "all" ? "/app/all" : `/app/d/${scope}`);
