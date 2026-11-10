import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import { LibraryProvider } from "./context/LibraryProvider";
import { ChatProvider } from "./context/ChatProvider";
import { useAuth } from "./context/hooks";
import { PublicOnly, RequireAuth } from "./components/RouteGuards";
import AppLayout from "./components/AppLayout";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

// Workspace pages load on demand; the chat thread carries the Markdown renderer,
// the largest dependency, which visitors to the landing page never need.
const AppHome = lazy(() => import("./pages/AppHome"));
const DocumentHub = lazy(() => import("./pages/DocumentHub"));
const ChatThread = lazy(() => import("./pages/ChatThread"));
const Settings = lazy(() => import("./pages/Settings"));

// Library and chat state belong to one account. Keying the providers by user id
// discards all of it, and aborts any running stream, when the account changes.
function Workspace() {
  const { user } = useAuth();
  return (
    <LibraryProvider key={user.id}>
      <ChatProvider key={user.id}>
        <AppLayout />
      </ChatProvider>
    </LibraryProvider>
  );
}

// Routes
//   /                        landing page
//   /login, /register        only when signed out
//   /app                     library home
//   /app/d/:docId            a document: continue a previous chat or start a new one
//   /app/d/:docId/new        new chat about the document
//   /app/d/:docId/c/:chatId  a saved chat
//   /app/all[/new|/c/:id]    the same, searching across every document
//   /app/settings            account and API key
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />

          <Route element={<PublicOnly />}>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
          </Route>

          <Route
            path="/app"
            element={
              <RequireAuth>
                <Workspace />
              </RequireAuth>
            }
          >
            <Route index element={<AppHome />} />
            <Route path="all" element={<DocumentHub />} />
            <Route path="all/new" element={<ChatThread />} />
            <Route path="all/c/:chatId" element={<ChatThread />} />
            <Route path="d/:docId" element={<DocumentHub />} />
            <Route path="d/:docId/new" element={<ChatThread />} />
            <Route path="d/:docId/c/:chatId" element={<ChatThread />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound inApp />} />
          </Route>

          {/* Paths from the previous version of the app */}
          <Route path="/chat" element={<Navigate to="/app" replace />} />
          <Route path="/profile" element={<Navigate to="/app/settings" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
