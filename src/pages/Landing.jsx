import { Link } from "react-router-dom";
import { ArrowRight, FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import { useAuth } from "../context/hooks";
import { APP_NAME, MAX_UPLOAD_MB } from "../config";
import useDocumentTitle from "../lib/useDocumentTitle";
import Logo from "../components/Logo";

const FAQ = [
  {
    q: "Which files can I upload?",
    a: `PDFs with selectable text, Excel workbooks (.xlsx and .xls) and CSV files, up to ${MAX_UPLOAD_MB} MB each. Scanned PDFs, which are photos of pages, have no text to read and aren't supported yet.`,
  },
  {
    q: "Can I connect a Google Sheet or Google Doc?",
    a: "Yes. Share the file as “Anyone with the link” and paste its link. Folio checks it for edits every couple of minutes and again right before answering a question about it, and re-indexes only the parts that changed. Every tab of a Doc and every sheet of a Sheet is included.",
  },
  {
    q: "How are spreadsheets handled?",
    a: "Each row is indexed together with its column names, sheet by sheet, so an answer can cite the exact rows it used. Questions are answered from the most relevant rows. For totals across thousands of rows, a spreadsheet formula is still the right tool.",
  },
  {
    q: "Are my chats saved?",
    a: "Yes. Every chat is saved to your account under the file it's about. When you open a file again you can continue a previous chat or start a new one, and follow-up questions keep the context of the chat they're asked in.",
  },
  {
    q: "Who can see my files?",
    a: "Only you. Files, their search index and your chats are tied to your account, and every request is checked against it on the server.",
  },
  {
    q: "Can I use my own Gemini API key?",
    a: "Yes. The shared key has a tight rate limit. You can add your own free key in Settings. It's kept in your browser and sent with your requests, never stored on the server.",
  },
];

export default function Landing() {
  useDocumentTitle("Ask your documents");
  const { status } = useAuth();
  const signedIn = status === "authenticated";

  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/" aria-label={`${APP_NAME} home`}>
          <Logo />
        </Link>
        <nav className="landing-nav-links" aria-label="Main">
          <a href="#how" className="hide-sm">
            How it works
          </a>
          <a href="#faq" className="hide-sm">
            FAQ
          </a>
          {signedIn ? (
            <Link to="/app" className="btn btn-primary btn-sm">
              Open library
            </Link>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">For PDFs, spreadsheets, Google Sheets and Docs</p>
            <h1 className="hero-title">Ask your documents. Get answers you can check.</h1>
            <p className="hero-lede">
              Upload a report, a contract or a sales sheet, or link a Google Sheet that keeps changing, and ask about it in plain
              language. Each answer cites the page or
              the rows it came from, and every chat is saved with the file so you can pick it up later.
            </p>
            <div className="button-row">
              <Link to={signedIn ? "/app" : "/register"} className="btn btn-primary btn-lg">
                {signedIn ? "Open your library" : "Create a free account"}
                <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
              </Link>
              {!signedIn && (
                <Link to="/login" className="btn btn-quiet btn-lg">
                  Sign in
                </Link>
              )}
            </div>
          </div>

          <figure className="hero-sample" aria-label="Example of a question and a cited answer">
            <div className="sample-file">
              <FileSpreadsheet size={16} strokeWidth={1.75} aria-hidden="true" />
              quarterly-sales-2026.xlsx
            </div>
            <p className="sample-question">Which region grew fastest, and who manages it?</p>
            <div className="sample-answer">
              <p>
                East grew fastest: revenue rose from ₹71,000 to ₹99,000, up 39%{" "}
                <span className="cite cite--static">1</span>. The region is managed by Meera Iyer{" "}
                <span className="cite cite--static">2</span>.
              </p>
            </div>
            <ul className="sample-sources">
              <li className="is-active">
                <span className="source-n">1</span>
                <span>
                  <span className="sample-where">Sales · rows 4–7</span>
                  Row 6: Region: East | Q2: 71000 | Q3: 99000
                </span>
              </li>
              <li>
                <span className="source-n">2</span>
                <span>
                  <span className="sample-where">Team · row 3</span>
                  Row 3: Region: East | Manager: Meera Iyer
                </span>
              </li>
            </ul>
          </figure>
        </section>

        <section className="landing-section" id="how" aria-labelledby="how-title">
          <h2 id="how-title" className="landing-h2">
            How it works
          </h2>
          <ol className="how-list">
            <li>
              <span className="how-n">01</span>
              <h3>Add a file</h3>
              <p>
                PDFs are read page by page. Spreadsheets are read row by row, with each value kept next to its column name.
                Google files are linked and kept in sync.
              </p>
            </li>
            <li>
              <span className="how-n">02</span>
              <h3>Ask in plain language</h3>
              <p>
                The most relevant passages are found and given to Gemini with your question. Follow-ups like "and the year
                before?" work, because the chat remembers itself.
              </p>
            </li>
            <li>
              <span className="how-n">03</span>
              <h3>Check the sources</h3>
              <p>
                Numbered citations link each statement to its page or rows. Open the reasoning to see how the answer was
                put together.
              </p>
            </li>
          </ol>
        </section>

        <section className="landing-section landing-split" aria-labelledby="formats-title">
          <div>
            <h2 id="formats-title" className="landing-h2">
              Upload it or link it
            </h2>
            <p className="landing-text">
              Ask one file at a time, or search across everything in your library at once. Answers drawn from several
              files name the file next to each citation.
            </p>
          </div>
          <ul className="format-list">
            <li>
              <FileText size={20} strokeWidth={1.75} aria-hidden="true" />
              <div>
                <h3>Documents</h3>
                <p>Reports, papers, contracts and manuals as PDF. Citations give the page number.</p>
              </div>
            </li>
            <li>
              <FileSpreadsheet size={20} strokeWidth={1.75} aria-hidden="true" />
              <div>
                <h3>Spreadsheets</h3>
                <p>Excel (.xlsx, .xls) and CSV, every sheet. Citations give the sheet and row range.</p>
              </div>
            </li>
            <li>
              <RefreshCw size={20} strokeWidth={1.75} aria-hidden="true" />
              <div>
                <h3>Google Sheets and Docs</h3>
                <p>Linked by share link and re-read when they change, so answers follow the latest edits.</p>
              </div>
            </li>
          </ul>
        </section>

        <section className="landing-section" id="faq" aria-labelledby="faq-title">
          <h2 id="faq-title" className="landing-h2">
            Questions
          </h2>
          <div className="faq">
            {FAQ.map((item) => (
              <details key={item.q} className="faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-foot">
        <Logo />
        <p>Built with React, Node.js, MongoDB Atlas Vector Search and Google Gemini.</p>
      </footer>
    </div>
  );
}
