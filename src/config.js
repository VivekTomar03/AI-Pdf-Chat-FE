// Product name, shown in the UI and the browser tab. Change it here only.
export const APP_NAME = "Folio";

// Trailing slashes are stripped because the streaming request builds its URL by
// hand, and "//api" is a different path to Express.
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "https://ai-chat-rag-lang.onrender.com"
).replace(/\/+$/, "");

export const MAX_UPLOAD_MB = 20;
export const ACCEPTED_EXTENSIONS = [".pdf", ".xlsx", ".xls", ".csv"];
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");
