import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CircleAlert, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/hooks";
import { errorMessage } from "../lib/api";
import useDocumentTitle from "../lib/useDocumentTitle";
import Logo from "../components/Logo";

const MIN_PASSWORD = 8;

export default function AuthPage({ mode }) {
  const isLogin = mode === "login";
  useDocumentTitle(isLogin ? "Sign in" : "Create an account");

  const { login, register } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!isLogin && password.length < MIN_PASSWORD) {
      setError(`Use a password of at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (!isLogin && password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await (isLogin ? login : register)(email, password);
      navigate(location.state?.from || "/app", { replace: true });
    } catch (err) {
      setError(errorMessage(err, isLogin ? "Sign in failed. Please try again." : "The account could not be created."));
      setBusy(false);
    }
  };

  const PasswordToggle = showPassword ? EyeOff : Eye;

  return (
    <div className="auth">
      <aside className="auth-aside">
        <Link to="/" aria-label="Home" className="auth-aside-logo">
          <Logo />
        </Link>
        <figure className="auth-quote">
          <blockquote>Which supplier raised prices in the third quarter, and by how much?</blockquote>
          <figcaption>
            Answered from <span className="mono">supplier-pricing.xlsx · rows 14–22</span>
          </figcaption>
        </figure>
        <ul className="auth-points">
          <li>Answers point to the page or rows they came from.</li>
          <li>Each file keeps its own saved chats. Continue one or start fresh.</li>
          <li>Works with PDFs, Excel workbooks and CSV files.</li>
        </ul>
      </aside>

      <main className="auth-main">
        <form className="auth-form" onSubmit={submit}>
          <Link to="/" aria-label="Home" className="auth-form-logo">
            <Logo />
          </Link>
          <h1 className="auth-title">{isLogin ? "Sign in" : "Create your account"}</h1>
          <p className="auth-sub">
            {isLogin
              ? "Your files and saved chats are where you left them."
              : "Free to use. All you need is an email address and a password."}
          </p>

          {error && (
            <p className="form-error" role="alert">
              <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
              {error}
            </p>
          )}

          <div className="field">
            <label htmlFor="auth-email" className="field-label">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              className="input"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="auth-password" className="field-label">
              Password
            </label>
            <div className="input-wrap">
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                className="input"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby={isLogin ? undefined : "auth-password-help"}
              />
              <button
                type="button"
                className="input-adorn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                <PasswordToggle size={17} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
            {!isLogin && (
              <p id="auth-password-help" className="field-help">
                At least {MIN_PASSWORD} characters.
              </p>
            )}
          </div>

          {!isLogin && (
            <div className="field">
              <label htmlFor="auth-confirm" className="field-label">
                Confirm password
              </label>
              <input
                id="auth-confirm"
                type={showPassword ? "text" : "password"}
                className="input"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {busy && <span className="spinner spinner--sm spinner--inverse" aria-hidden="true" />}
            {busy ? (isLogin ? "Signing in…" : "Creating account…") : isLogin ? "Sign in" : "Create account"}
          </button>

          <p className="auth-switch">
            {isLogin ? "New here?" : "Already have an account?"}{" "}
            <Link to={isLogin ? "/register" : "/login"} state={location.state}>
              {isLogin ? "Create an account" : "Sign in"}
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
