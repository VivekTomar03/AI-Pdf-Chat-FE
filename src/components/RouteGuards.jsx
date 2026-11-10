import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/hooks";
import FullPageStatus from "./FullPageStatus";

// Client-side guards only decide what to render. Real access control is the
// server checking the token on every request.
export function RequireAuth({ children }) {
  const { status, retry } = useAuth();
  const location = useLocation();

  if (status === "checking") {
    return (
      <FullPageStatus
        busy
        title="Opening your library"
        detail="If the server has been idle it can take up to a minute to wake up."
      />
    );
  }

  if (status === "unreachable") {
    return (
      <FullPageStatus
        title="Can't reach the server"
        detail="Your session is still saved. Check your connection, then try again."
        action={
          <button type="button" className="btn btn-primary" onClick={retry}>
            Try again
          </button>
        }
      />
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return children;
}

export function PublicOnly() {
  const { status } = useAuth();

  if (status === "authenticated") return <Navigate to="/app" replace />;
  if (status === "checking") return <FullPageStatus busy title="Checking your session" />;

  return <Outlet />;
}
