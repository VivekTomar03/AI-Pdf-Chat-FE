import { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../App.css";
import { ChatContext } from "../context/ChatContext";

const parseInline = (text) => {
  if (!text) return "";

  // Split by bold patterns first
  const boldParts = text.split(/(\*\*.*?\*\*)/g);

  return boldParts.flatMap((part, partIdx) => {
    let isBold = false;
    let cleanPart = part;

    if (part.startsWith("**") && part.endsWith("**")) {
      isBold = true;
      cleanPart = part.slice(2, -2);
    }

    // Split by inline code pattern `code`
    const codeParts = cleanPart.split(/(`.*?`)/g);
    const elements = codeParts.map((subPart, subPartIdx) => {
      if (subPart.startsWith("`") && subPart.endsWith("`")) {
        return (
          <code
            key={`${partIdx}-${subPartIdx}`}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "monospace",
              fontSize: "0.9em",
              color: "#fca5a5"
            }}
          >
            {subPart.slice(1, -1)}
          </code>
        );
      }
      return subPart;
    });

    if (isBold) {
      return <strong key={partIdx}>{elements}</strong>;
    }
    return elements;
  });
};

const parseMarkdown = (text) => {
  if (!text) return "";

  const lines = text.split("\n");

  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();

    // 1. Check for headings
    if (trimmed.startsWith("### ")) {
      const headerText = trimmed.substring(4);
      return <h4 key={lineIdx} style={{ margin: "12px 0 6px 0", color: "var(--text-main)", fontWeight: "600" }}>{parseInline(headerText)}</h4>;
    }
    if (trimmed.startsWith("## ")) {
      const headerText = trimmed.substring(3);
      return <h3 key={lineIdx} style={{ margin: "16px 0 8px 0", color: "var(--text-main)", fontWeight: "600" }}>{parseInline(headerText)}</h3>;
    }
    if (trimmed.startsWith("# ")) {
      const headerText = trimmed.substring(2);
      return <h2 key={lineIdx} style={{ margin: "20px 0 10px 0", color: "var(--text-main)", fontWeight: "700" }}>{parseInline(headerText)}</h2>;
    }

    // 2. Check for bullet points
    const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ");
    // 3. Check for numbered list items
    const numListMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);

    if (isBullet) {
      const cleanLine = trimmed.substring(2);
      return (
        <div key={lineIdx} style={{ display: "flex", gap: "8px", alignItems: "flex-start", margin: "4px 0 4px 12px", lineHeight: "1.6" }}>
          <span style={{ color: "var(--accent-color)" }}>•</span>
          <div>{parseInline(cleanLine)}</div>
        </div>
      );
    }

    if (numListMatch) {
      const num = numListMatch[1];
      const cleanLine = numListMatch[2];
      return (
        <div key={lineIdx} style={{ display: "flex", gap: "8px", alignItems: "flex-start", margin: "4px 0 4px 12px", lineHeight: "1.6" }}>
          <span style={{ color: "var(--accent-color)", fontWeight: "600" }}>{num}.</span>
          <div>{parseInline(cleanLine)}</div>
        </div>
      );
    }

    // Default paragraph
    return (
      <p key={lineIdx} style={{ margin: "0 0 8px 0", lineHeight: "1.6" }}>
        {parseInline(line)}
      </p>
    );
  });
};

function ChatPage() {
  const {
    messages,
    setMessages,
    documents,
    setDocuments,
    selectedDocId,
    setSelectedDocId,
    chatLoading,
    setChatLoading,
    docsLoading,
    setDocsLoading,
    uploadLoading,
    setUploadLoading,
    deleteLoading,
    setDeleteLoading,
    fetchDocuments,
    clearChatState,
    deleteDocHistory,
  } = useContext(ChatContext);

  const [message, setMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [expandedSources, setExpandedSources] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [expandedThoughts, setExpandedThoughts] = useState({});

  const toggleThoughts = (index) => {
    setExpandedThoughts((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleCopySource = (text, msgIdx, chunkIdx) => {
    navigator.clipboard.writeText(text);
    const key = `${msgIdx}-${chunkIdx}`;
    setCopiedIndex(key);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Auto-scroll to the bottom of the chat when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load documents on mount
  useEffect(() => {
    if (documents.length === 0) {
      fetchDocuments(handleLogout);
    }
  }, []);

  const uploadFile = async (file) => {
    if (!file) return;

    try {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append("pdf", file);

      const res = await api.post("/upload-pdf", formData);
      if (res.data.success) {
        alert("PDF Uploaded and Analyzed Successfully");
        await fetchDocuments(handleLogout);
        setSelectedDocId(res.data.documentId);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload PDF");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const deleteDocument = async (id, e) => {
    e.stopPropagation(); // Avoid selecting the card when deleting it
    if (!window.confirm("Are you sure you want to delete this document and all its embeddings?")) return;

    try {
      setDeleteLoading(id);
      const res = await api.delete(`/documents/${id}`);
      if (res.data.success) {
        setDocuments((prev) => prev.filter((doc) => doc._id !== id));
        deleteDocHistory(id);
        if (selectedDocId === id) {
          setSelectedDocId("");
        }
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete document");
    } finally {
      setDeleteLoading(null);
    }
  };

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!message.trim() || !selectedDocId) return;

    const userMessage = {
      role: "user",
      text: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentQuestion = message;
    setMessage("");

    try {
      setChatLoading(true);
      const res = await api.post("/ask-pdf", {
        question: currentQuestion,
        documentId: selectedDocId,
      });

      const aiMessage = {
        role: "ai",
        text: res.data.answer,
        thought: res.data.thought || null,
        matchedChunks: res.data.matchedChunks || [],
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Failed to answer question:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Sorry, I ran into an error while trying to process your request.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const toggleSources = (index) => {
    setExpandedSources((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    clearChatState();
    navigate("/login");
  };

  const activeDoc = documents.find((d) => d._id === selectedDocId);

  return (
    <div className="app-container">
      {/* SIDEBAR OVERLAY FOR MOBILE */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* SIDEBAR */}
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' }}>
          <div className="sidebar-header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h2>📄 AI PDF RAG Chat</h2>
            <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} title="Close Menu">
              ✕
            </button>
          </div>
          <div className="sidebar-header-actions" style={{ display: "flex", gap: "8px", width: "100%", justifyContent: "space-between" }}>
            <button className="profile-btn" onClick={() => navigate("/profile")} title="Profile" style={{ flexGrow: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              👤 Profile
            </button>
            <button className="logout-btn" onClick={handleLogout} title="Logout" style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              🚪 Logout
            </button>
          </div>
        </div>

        <div className="sidebar-content">
          {/* DRAG AND DROP ZONE */}
          <div
            className={`upload-zone ${dragActive ? "drag-active" : ""}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => !uploadLoading && fileInputRef.current?.click()}
          >
            {uploadLoading ? (
              <>
                <div className="spinner"></div>
                <div className="upload-text">Processing PDF...</div>
              </>
            ) : (
              <>
                <span className="upload-icon">📤</span>
                <div className="upload-text">
                  <span>Click to upload</span> or drag & drop a PDF
                </div>
              </>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="file-input"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={uploadLoading}
            />
          </div>

          {/* DOCUMENTS LIST */}
          <div className="document-list-container">
            <div className="section-title">My Documents</div>
            {docsLoading ? (
              <div className="docs-loading">
                <div className="spinner"></div>
                <span>Loading documents...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="no-docs">No PDFs uploaded yet. Upload one above to begin.</div>
            ) : (
              <div className="document-list">
                {documents.map((doc) => (
                  <div
                    key={doc._id}
                    className={`document-item ${selectedDocId === doc._id ? "active" : ""}`}
                    onClick={() => {
                      if (!deleteLoading && !uploadLoading) {
                        setSelectedDocId(doc._id);
                        setSidebarOpen(false); // Close sidebar on mobile
                      }
                    }}
                  >
                    <div className="doc-info">
                      <span className="doc-icon">📄</span>
                      <div className="doc-details">
                        <span className="doc-name" title={doc.name}>
                          {doc.name}
                        </span>
                        <span className="doc-date">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      className="delete-btn"
                      onClick={(e) => deleteDocument(doc._id, e)}
                      disabled={deleteLoading !== null}
                      title="Delete document"
                    >
                      {deleteLoading === doc._id ? (
                        <div className="spinner-small" style={{ borderTopColor: "var(--error-color)" }}></div>
                      ) : (
                        "🗑️"
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="chat-area">
        {/* CHAT HEADER */}
        <div className="chat-header">
          <button className="menu-toggle-btn" onClick={() => setSidebarOpen(true)} title="Open Menu">
            ☰
          </button>
          {activeDoc ? (
            <div style={{ textAlign: "left", flexGrow: 1, marginLeft: "12px" }}>
              <h3 style={{ margin: 0 }}>Chatting with: {activeDoc.name}</h3>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Scoped RAG Querying active</span>
            </div>
          ) : (
            <div style={{ textAlign: "left", flexGrow: 1, marginLeft: "12px" }}>
              <h3 style={{ margin: 0 }}>Select a document</h3>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Please upload or select a document to start</span>
            </div>
          )}
        </div>

        {/* MESSAGES */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-chat">
              <span className="empty-chat-icon">💬</span>
              <h4>Welcome to AI PDF RAG Chat!</h4>
              {activeDoc ? (
                <p>
                  You are chatting with <strong>{activeDoc.name}</strong>. Ask any question about its contents!
                </p>
              ) : (
                <p>Please select a PDF document from the sidebar or upload a new one to begin asking questions.</p>
              )}
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`message-wrapper ${msg.role}`}>
                <div className="message-bubble">{parseMarkdown(msg.text)}</div>
                <div className="message-meta">
                  {msg.role === "user" ? "User" : "AI Assistant"}
                </div>

                {/* Collapsible Model Thinking Process */}
                {msg.role === "ai" && msg.thought && (
                  <div className="thought-container">
                    <button
                      className="thought-toggle-btn"
                      onClick={() => toggleThoughts(index)}
                    >
                      {expandedThoughts[index] ? "🤔 Hide Thinking Process" : "🤔 Show Thinking Process"}
                    </button>
                    {expandedThoughts[index] && (
                      <div className="thought-content-box">
                        {parseMarkdown(msg.thought)}
                      </div>
                    )}
                  </div>
                )}

                {/* Visual Citations and Chunk Highlights */}
                {msg.role === "ai" && msg.matchedChunks && msg.matchedChunks.length > 0 && (
                  <div className="source-container">
                    <button
                      className="source-toggle-btn"
                      onClick={() => toggleSources(index)}
                    >
                      🔍 {expandedSources[index] ? "Hide Citations" : `Show Citations (${msg.matchedChunks.length})`}
                    </button>
                    {expandedSources[index] && (
                      <div className="source-cards-grid">
                        {msg.matchedChunks.map((chunk, chunkIdx) => (
                          <div key={chunkIdx} className="source-card">
                            <div className="source-card-header">
                              <span className="source-card-badge">
                                📄 {chunk.pageNumber ? `Page ${chunk.pageNumber}` : `Source #${chunkIdx + 1}`}
                              </span>
                              <button
                                type="button"
                                className="source-copy-btn"
                                onClick={() => handleCopySource(chunk.text, index, chunkIdx)}
                                title="Copy source text to clipboard"
                              >
                                {copiedIndex === `${index}-${chunkIdx}` ? "✓ Copied" : "📋 Copy"}
                              </button>
                            </div>
                            <div className="source-card-body">
                              {chunk.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          {chatLoading && (
            <div className="message-wrapper ai">
              <div className="message-bubble" style={{ minWidth: "160px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div className="spinner-small"></div>
                  <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Formulating answer...</span>
                </div>
              </div>
              <div className="thought-container" style={{ marginTop: "10px" }}>
                <div className="thought-content-box" style={{ marginTop: 0, display: "flex", alignItems: "center", gap: "8px", borderLeftColor: "var(--accent-color)" }}>
                  <div className="spinner-small" style={{ borderTopColor: "var(--accent-color)", width: "12px", height: "12px" }}></div>
                  <span style={{ fontSize: "13px", fontStyle: "italic", color: "var(--text-muted)" }}>Thinking about query and context...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* INPUT CONTAINER */}
        <div className="chat-input-container">
          <form className="chat-input-form" onSubmit={sendMessage}>
            <textarea
              className="chat-textarea"
              rows="1"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                // Submit on Enter without shift key
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={
                activeDoc
                  ? "Ask anything about this document..."
                  : "Please select or upload a document to begin..."
              }
              disabled={!activeDoc || chatLoading}
            />
            <button
              type="submit"
              className="send-button"
              disabled={!activeDoc || !message.trim() || chatLoading}
            >
              ➔
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
