import { LogOut } from "lucide-react";
import { useAuth, useLibrary } from "../context/hooks";
import { shortDate } from "../lib/format";
import useDocumentTitle from "../lib/useDocumentTitle";
import ApiKeysSection from "../components/ApiKeysSection";

export default function Settings() {
  useDocumentTitle("Settings");
  const { user, logout } = useAuth();
  const { documents } = useLibrary();

  return (
    <div className="page page--narrow">
      <header className="page-head">
        <p className="eyebrow">Account</p>
        <h1 className="page-title">Settings</h1>
      </header>

      <section className="settings-section" aria-labelledby="settings-account">
        <h2 id="settings-account" className="settings-title">
          Account
        </h2>
        <dl className="facts">
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>{shortDate(user.createdAt) || "—"}</dd>
          </div>
          <div>
            <dt>Files in library</dt>
            <dd>{documents.length}</dd>
          </div>
        </dl>
      </section>

      <ApiKeysSection userId={user.id} />

      <section className="settings-section" aria-labelledby="settings-session">
        <h2 id="settings-session" className="settings-title">
          Session
        </h2>
        <p className="settings-text">Your files and chats stay saved on your account after you sign out.</p>
        <button type="button" className="btn btn-quiet" onClick={logout}>
          <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
          Sign out
        </button>
      </section>
    </div>
  );
}
