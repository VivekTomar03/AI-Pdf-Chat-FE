import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// The model cites passages as [1] or [2, 3]. Rewrite those into fragment links
// so they can render as buttons; "[text](url)" links are left alone.
const CITATION = /\[(\d{1,2}(?:\s*,\s*\d{1,2})*)\](?![(:])/g;

// Models often put a table's citation on the line right after it ("| ... |\n[1]"),
// which GFM reads as one more table row. A blank line ends the table first.
const TRAILING_TABLE_CITATION = /^(\|.*\|[ \t]*)\n((?:[ \t]*\[\d{1,2}(?:\s*,\s*\d{1,2})*\])+[ \t]*)$/gm;

const linkCitations = (text) =>
  text.replace(TRAILING_TABLE_CITATION, "$1\n\n$2").replace(CITATION, (_, numbers) =>
    numbers
      .split(/\s*,\s*/)
      .map((n) => `[${n}](#cite-${n})`)
      .join("")
  );

// Raw HTML in model output is not rendered (react-markdown escapes it), so an
// answer cannot inject markup into the page.
export default function Markdown({ text, onCite }) {
  const components = useMemo(
    () => ({
      a: ({ href, children }) => {
        const citation = /^#cite-(\d+)$/.exec(href || "");
        if (citation) {
          const n = Number(citation[1]);
          return (
            <button type="button" className="cite" onClick={() => onCite?.(n)} aria-label={`Show source ${n}`}>
              {n}
            </button>
          );
        }
        return (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        );
      },
      table: ({ children }) => (
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Table">
          <table>{children}</table>
        </div>
      ),
    }),
    [onCite]
  );

  return (
    <div className="prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {onCite ? linkCitations(text) : text}
      </ReactMarkdown>
    </div>
  );
}
