import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { ChatContext } from "../context/ChatContext";

function ProfilePage() {
  const { documents, fetchDocuments, clearChatState } = useContext(ChatContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem("gemini_api_key") || "");
  const [showKey, setShowKey] = useState(false);
  const [keyMessage, setKeyMessage] = useState("");
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        // Fetch user metadata
        const profileRes = await api.get("/auth/profile");
        if (profileRes.data.success) {
          setProfile(profileRes.data.user);
        }

        // Fetch documents if not loaded yet
        if (documents.length === 0) {
          await fetchDocuments(handleLogout);
        }
      } catch (err) {
        console.error("Error loading profile data:", err);
        setError("Failed to load profile details. Please log in again.");
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [navigate, documents.length]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    clearChatState();
    navigate("/login");
  };

  const handleSaveKey = (e) => {
    e.preventDefault();
    setKeyMessage("");
    if (!geminiKey.trim()) {
      localStorage.removeItem("gemini_api_key");
      setKeyMessage("Custom API Key cleared.");
    } else {
      localStorage.setItem("gemini_api_key", geminiKey.trim());
      setKeyMessage("Custom API Key saved successfully!");
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem("gemini_api_key");
    setGeminiKey("");
    setKeyMessage("Custom API Key removed.");
  };

  return (
    <div className="auth-page">
      <div className="auth-card profile-card" style={{ width: "480px" }}>
        <div className="auth-header">
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>👤</div>
          <h1>User Profile</h1>
          <p>Manage your account settings & data overview</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {loading ? (
          <div className="docs-loading">
            <div className="spinner"></div>
            <span>Fetching profile details...</span>
          </div>
        ) : (
          profile && (
            <div className="profile-details-container" style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
              <div className="profile-info-item" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                <div className="form-label" style={{ marginBottom: "4px" }}>Email Address</div>
                <div style={{ fontSize: "16px", fontWeight: "500", color: "var(--text-main)" }}>{profile.email}</div>
              </div>

              <div className="profile-info-item" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                <div className="form-label" style={{ marginBottom: "4px" }}>Total Uploaded PDFs</div>
                <div style={{ fontSize: "16px", fontWeight: "500", color: "var(--text-main)" }}>{documents.length} documents</div>
              </div>

              <div className="profile-info-item" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                <div className="form-label" style={{ marginBottom: "4px" }}>Account Created</div>
                <div style={{ fontSize: "16px", fontWeight: "500", color: "var(--text-main)" }}>
                  {new Date(profile.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>

              {/* Custom Gemini Key Section */}
              <div className="profile-info-item" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div className="form-label">Custom Gemini API Key (Bypass Limits)</div>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0", lineHeight: "1.4" }}>
                  ⚠️ <strong>Privacy Note:</strong> We use browser storage to store your key. We do not save any key on our server, and we don't have access to your key. It is sent only to make requests directly to Gemini APIs.
                </p>
                <form onSubmit={handleSaveKey} style={{ display: "flex", gap: "8px", width: "100%", marginTop: "6px" }}>
                  <div style={{ position: "relative", flexGrow: 1 }}>
                    <input
                      type={showKey ? "text" : "password"}
                      className="form-input"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      style={{ width: "100%", boxSizing: "border-box", paddingRight: "40px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "14px"
                      }}
                    >
                      {showKey ? "👁️" : "🙈"}
                    </button>
                  </div>
                  <button type="submit" className="auth-button" style={{ padding: "10px 14px", height: "42px", flexShrink: 0, fontSize: "13px" }}>
                    Save
                  </button>
                  {localStorage.getItem("gemini_api_key") && (
                    <button type="button" onClick={handleClearKey} className="auth-button" style={{ padding: "10px 14px", height: "42px", flexShrink: 0, background: "rgba(239, 68, 68, 0.2)", border: "1px solid var(--error-color)", color: "#fca5a5", fontSize: "13px" }}>
                      Remove
                    </button>
                  )}
                </form>
                {keyMessage && (
                  <div style={{ fontSize: "13px", color: keyMessage.includes("success") ? "var(--success-color)" : "var(--text-muted)", marginTop: "4px" }}>
                    {keyMessage}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button
                  onClick={() => navigate("/chat")}
                  className="auth-button"
                  style={{ flexGrow: 1, background: "var(--border-color)", boxShadow: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  ⬅ Back to Chat
                </button>
                <button
                  onClick={handleLogout}
                  className="auth-button"
                  style={{ flexGrow: 1, background: "rgba(239, 68, 68, 0.2)", border: "1px solid var(--error-color)", color: "#fca5a5", boxShadow: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
