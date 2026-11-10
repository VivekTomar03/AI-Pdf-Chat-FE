import Logo from "./Logo";

export default function FullPageStatus({ title, detail, action, busy = false }) {
  return (
    <main className="full-status" aria-busy={busy}>
      <Logo />
      <div className="full-status-body" role="status">
        {busy && <span className="spinner" aria-hidden="true" />}
        <h1 className="full-status-title">{title}</h1>
        {detail && <p className="full-status-detail">{detail}</p>}
        {action}
      </div>
    </main>
  );
}
