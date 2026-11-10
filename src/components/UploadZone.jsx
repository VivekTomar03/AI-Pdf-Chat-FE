import { useRef, useState } from "react";
import { CircleAlert, Upload, X } from "lucide-react";
import { useLibrary } from "../context/hooks";
import { ACCEPT_ATTRIBUTE, MAX_UPLOAD_MB } from "../config";

// Drag-and-drop target with its own progress list, so uploads are visible on
// phones where the sidebar (which also shows them) is tucked away.
export default function UploadZone({ onUploaded, title = "Drop a file here" }) {
  const { upload, uploads, dismissUpload } = useLibrary();
  const [dragging, setDragging] = useState(false);
  const input = useRef(null);

  const handleFiles = async (fileList) => {
    const files = [...fileList];
    if (!files.length) return;
    const created = await Promise.all(files.map((file) => upload(file)));
    const first = created.find(Boolean);
    if (files.length === 1 && first) onUploaded?.(first);
  };

  return (
    <div className="upload-zone">
      <div
        className={`dropzone${dragging ? " is-dragging" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        <span className="dropzone-icon" aria-hidden="true">
          <Upload size={20} strokeWidth={1.75} />
        </span>
        <div className="dropzone-text">
          <p className="dropzone-title">
            {title}, or{" "}
            <button type="button" className="link-btn" onClick={() => input.current?.click()}>
              choose from your device
            </button>
          </p>
          <p className="dropzone-sub">PDF, Excel (.xlsx, .xls) or CSV, up to {MAX_UPLOAD_MB} MB each.</p>
        </div>
        <input
          ref={input}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          multiple
          className="visually-hidden"
          tabIndex={-1}
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {uploads.length > 0 && (
        <ul className="zone-uploads">
          {uploads.map((item) => (
            <li key={item.id} className={`zone-upload${item.phase === "error" ? " is-error" : ""}`}>
              {item.phase === "error" ? (
                <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <span className="spinner spinner--sm" aria-hidden="true" />
              )}
              <span className="zone-upload-name">{item.name}</span>
              <span className="zone-upload-state" role={item.phase === "error" ? "alert" : "status"}>
                {item.phase === "error"
                  ? item.error
                  : item.phase === "linking"
                    ? "Reading from Google and indexing…"
                    : item.phase === "indexing"
                    ? "Reading and indexing…"
                    : `Uploading ${Math.round(item.progress * 100)}%`}
              </span>
              {item.phase === "error" && (
                <button type="button" className="icon-btn icon-btn--sm" onClick={() => dismissUpload(item.id)} aria-label={`Dismiss error for ${item.name}`}>
                  <X size={15} strokeWidth={1.75} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
