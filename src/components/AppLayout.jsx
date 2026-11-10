import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Menu, Settings as SettingsIcon } from "lucide-react";
import Sidebar from "./Sidebar";
import Logo from "./Logo";

// Desktop: persistent sidebar. Tablet and phone (< 1024px): the sidebar becomes
// a drawer opened from the top bar.
export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sidebarRef = useRef(null);
  const menuButtonRef = useRef(null);

  const openDrawer = () => {
    setDrawerOpen(true);
    // Move focus into the drawer so keyboard and screen-reader users land in it.
    requestAnimationFrame(() => sidebarRef.current?.focus());
  };

  // After following a link: just close; focus belongs to the new page.
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Escape, the scrim or the close button: return focus to the menu button.
  const dismissDrawer = useCallback(() => {
    setDrawerOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") dismissDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, dismissDrawer]);

  return (
    <div className="shell" data-drawer={drawerOpen ? "open" : "closed"}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <aside
        ref={sidebarRef}
        className="shell-sidebar"
        aria-label="Library"
        tabIndex={-1}
      >
        <Sidebar onNavigate={closeDrawer} onClose={dismissDrawer} />
      </aside>

      <div className="shell-scrim" onClick={dismissDrawer} aria-hidden="true" />

      <div className="shell-main">
        <header className="topbar">
          <button
            ref={menuButtonRef}
            type="button"
            className="icon-btn"
            onClick={openDrawer}
            aria-label="Open library"
            aria-expanded={drawerOpen}
          >
            <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <Link to="/app" className="topbar-logo" aria-label="Library home">
            <Logo />
          </Link>
          <Link to="/app/settings" className="icon-btn" aria-label="Settings">
            <SettingsIcon size={19} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </header>

        <main id="main" className="shell-content" tabIndex={-1}>
          <Suspense
            fallback={
              <div className="page" aria-busy="true">
                <div className="skeleton skeleton--title" />
                <div className="skeleton skeleton--card" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
