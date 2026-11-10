import { FileSpreadsheet, FileText, Library } from "lucide-react";

export default function FileIcon({ type, size = 18 }) {
  const props = { size, strokeWidth: 1.75, "aria-hidden": true, className: `file-icon file-icon--${type || "pdf"}` };
  if (type === "all") return <Library {...props} />;
  if (type === "spreadsheet") return <FileSpreadsheet {...props} />;
  return <FileText {...props} />;
}
