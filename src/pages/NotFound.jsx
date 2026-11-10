import { Link } from "react-router-dom";
import useDocumentTitle from "../lib/useDocumentTitle";
import Logo from "../components/Logo";

export default function NotFound({ inApp = false }) {
  useDocumentTitle("Page not found");

  const body = (
    <>
      <p className="eyebrow">404</p>
      <h1 className="page-title">This page doesn't exist</h1>
      <p className="lede">The link may be out of date, or the file or chat it pointed to was deleted.</p>
      <Link to={inApp ? "/app" : "/"} className="btn btn-primary">
        {inApp ? "Back to your library" : "Go to the home page"}
      </Link>
    </>
  );

  if (inApp) return <div className="page page--narrow">{body}</div>;

  return (
    <main className="full-status">
      <Link to="/" aria-label="Home">
        <Logo />
      </Link>
      <div className="full-status-body">{body}</div>
    </main>
  );
}
