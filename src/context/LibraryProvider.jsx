import { useCallback, useEffect, useMemo, useState } from "react";
import api, { errorMessage } from "../lib/api";
import { googleLabel, googleLinkType, isGoogleLinked, validateFile } from "../lib/format";
import { LibraryContext } from "./hooks";

let uploadCounter = 0;

// How often the library is re-read while linked Google files are present, so
// their "checked" and "updated" times follow the server's background sync.
const LINKED_REFRESH_MS = 60_000;

// The signed-in user's documents and any uploads in flight.
export function LibraryProvider({ children }) {
  const [documents, setDocuments] = useState([]);
  const [allDocuments, setAllDocuments] = useState({ conversationCount: 0, lastActivityAt: null });
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  // { id, name, progress (0-1), phase: "uploading" | "indexing" | "linking" | "error", error }
  const [uploads, setUploads] = useState([]);

  const applyLibrary = useCallback((res) => {
    setDocuments(res.data.documents);
    setAllDocuments(res.data.allDocuments);
    setStatus("ready");
    setError("");
  }, []);

  const applyError = useCallback((err) => {
    setError(errorMessage(err, "Your library could not be loaded."));
    // A failed background refresh keeps showing the library that loaded before.
    setStatus((current) => (current === "ready" ? current : "error"));
  }, []);

  const refresh = useCallback(
    () => api.get("/documents").then(applyLibrary, applyError),
    [applyLibrary, applyError]
  );

  useEffect(() => {
    api.get("/documents").then(applyLibrary, applyError);
  }, [applyLibrary, applyError]);

  const hasLinked = documents.some(isGoogleLinked);
  useEffect(() => {
    if (!hasLinked) return undefined;
    const refreshIfVisible = () => {
      if (window.document.visibilityState === "visible") refresh();
    };
    const timer = setInterval(refreshIfVisible, LINKED_REFRESH_MS);
    window.document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      clearInterval(timer);
      window.document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [hasLinked, refresh]);

  const updateUpload = (id, patch) =>
    setUploads((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  // Resolves to the new document, or null if the upload failed (the failure is
  // kept in `uploads` so the UI can show it).
  const upload = useCallback(async (file) => {
    const id = `upload-${++uploadCounter}`;
    const invalid = validateFile(file);
    setUploads((list) => [
      ...list,
      invalid
        ? { id, name: file.name, progress: 0, phase: "error", error: invalid }
        : { id, name: file.name, progress: 0, phase: "uploading", error: "" },
    ]);
    if (invalid) return null;

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await api.post("/documents", form, {
        onUploadProgress: (event) => {
          const progress = event.total ? event.loaded / event.total : 0;
          // Once the bytes are sent the server is still extracting and embedding.
          updateUpload(id, { progress, phase: progress >= 1 ? "indexing" : "uploading" });
        },
      });
      setUploads((list) => list.filter((item) => item.id !== id));
      setDocuments((list) => [{ ...res.data.document }, ...list]);
      return res.data.document;
    } catch (err) {
      updateUpload(id, { phase: "error", error: errorMessage(err, "The upload failed.") });
      return null;
    }
  }, []);

  // Links a Google Sheet or Doc. Resolves to { document } or { error, documentId }
  // (documentId is set when the file is already in the library). Errors are
  // returned rather than listed, so the form can keep the link for editing.
  const linkGoogle = useCallback(async (url) => {
    const id = `upload-${++uploadCounter}`;
    const type = googleLinkType(url);
    setUploads((list) => [...list, { id, name: type ? googleLabel(type) : "Google file", progress: 1, phase: "linking", error: "" }]);

    try {
      const res = await api.post("/documents/google", { url });
      setDocuments((list) => [res.data.document, ...list]);
      return { document: res.data.document };
    } catch (err) {
      return {
        error: errorMessage(err, "The file couldn't be linked."),
        documentId: err.response?.data?.documentId || null,
      };
    } finally {
      setUploads((list) => list.filter((item) => item.id !== id));
    }
  }, []);

  const replaceDocument = (doc) => setDocuments((list) => list.map((item) => (item._id === doc._id ? doc : item)));

  // Checks a linked file for edits now. Resolves to the server's outcome.
  const syncDocument = useCallback(async (documentId) => {
    setDocuments((list) =>
      list.map((item) => (item._id === documentId ? { ...item, source: { ...item.source, checking: true } } : item))
    );
    try {
      const res = await api.post(`/documents/${documentId}/sync`);
      replaceDocument(res.data.document);
      return res.data;
    } catch (err) {
      setDocuments((list) =>
        list.map((item) => (item._id === documentId ? { ...item, source: { ...item.source, checking: false } } : item))
      );
      throw err;
    }
  }, []);

  const dismissUpload = useCallback((id) => {
    setUploads((list) => list.filter((item) => item.id !== id));
  }, []);

  const removeDocument = useCallback(async (documentId) => {
    await api.delete(`/documents/${documentId}`);
    setDocuments((list) => list.filter((doc) => doc._id !== documentId));
  }, []);

  const value = useMemo(
    () => ({
      documents,
      allDocuments,
      status,
      error,
      uploads,
      refresh,
      upload,
      linkGoogle,
      syncDocument,
      dismissUpload,
      removeDocument,
    }),
    [documents, allDocuments, status, error, uploads, refresh, upload, linkGoogle, syncDocument, dismissUpload, removeDocument]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}
