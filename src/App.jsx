import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [expandedSources, setExpandedSources] = useState({});

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to the bottom of the chat when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await axios.get("https://ai-chat-rag-lang.onrender.com/documents");
      if (res.data.success) {
        setDocuments(res.data.documents);
        // Automatically select the first document if available and none selected
        if (res.data.documents.length > 0 && !selectedDocId) {
          setSelectedDocId(res.data.documents[0]._id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("pdf", file);

      const res = await axios.post("https://ai-chat-rag-lang.onrender.com/upload-pdf", formData);
      if (res.data.success) {
        alert("PDF Uploaded and Analyzed Successfully");
        await fetchDocuments();
        setSelectedDocId(res.data.documentId);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload PDF");
    } finally {
      setLoading(false);
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
      setLoading(true);
      const res = await axios.delete(`https://ai-chat-rag-lang.onrender.com/documents/${id}`);
      if (res.data.success) {
        setDocuments((prev) => prev.filter((doc) => doc._id !== id));
        if (selectedDocId === id) {
          setSelectedDocId("");
          setMessages([]);
        }
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete document");
    } finally {
      setLoading(false);
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
      setLoading(true);
      const res = await axios.post("https://ai-chat-rag-lang.onrender.com/ask-pdf", {
        question: currentQuestion,
        documentId: selectedDocId,
      });

      const aiMessage = {
        role: "ai",
        text: res.data.answer,
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
      setLoading(false);
    }
  };

  const toggleSources = (index) => {
    setExpandedSources((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const activeDoc = documents.find((d) => d._id === selectedDocId);

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>📄 AI PDF RAG Chat</h2>
        </div>

        <div className="sidebar-content">
          {/* DRAG AND DROP ZONE */}
          <div
            className={`upload-zone ${dragActive ? "drag-active" : ""}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="upload-icon">📤</span>
            <div className="upload-text">
              <span>Click to upload</span> or drag & drop a PDF
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="file-input"
              accept=".pdf"
              onChange={handleFileChange}
            />
          </div>

          {/* DOCUMENTS LIST */}
          <div className="document-list-container">
            <div className="section-title">My Documents</div>
            {documents.length === 0 ? (
              <div className="no-docs">No PDFs uploaded yet. Upload one above to begin.</div>
            ) : (
              <div className="document-list">
                {documents.map((doc) => (
                  <div
                    key={doc._id}
                    className={`document-item ${selectedDocId === doc._id ? "active" : ""}`}
                    onClick={() => {
                      setSelectedDocId(doc._id);
                      setMessages([]); // Clear chat history when switching documents
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
                      title="Delete document"
                    >
                      🗑️
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
          {activeDoc ? (
            <div>
              <h3>Chatting with: {activeDoc.name}</h3>
              <span>Scoped RAG Querying active</span>
            </div>
          ) : (
            <div>
              <h3>Select a document</h3>
              <span>Please upload or select a document to start</span>
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
                <div className="message-bubble">{msg.text}</div>
                <div className="message-meta">
                  {msg.role === "user" ? "User" : "AI Assistant"}
                </div>

                {/* Retained sources list */}
                {msg.role === "ai" && msg.matchedChunks && msg.matchedChunks.length > 0 && (
                  <div className="source-container">
                    <button
                      className="source-toggle-btn"
                      onClick={() => toggleSources(index)}
                    >
                      🔍 {expandedSources[index] ? "Hide Sources" : `Show Sources (${msg.matchedChunks.length})`}
                    </button>
                    {expandedSources[index] && (
                      <div className="source-chunks">
                        {msg.matchedChunks.map((chunk, chunkIdx) => (
                          <div key={chunkIdx} className="source-chunk">
                            <strong>Source Chunk #{chunkIdx + 1}</strong>
                            {chunk.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="message-wrapper ai">
              <div className="message-bubble">
                <div className="spinner"></div>
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
              disabled={!activeDoc || loading}
            />
            <button
              type="submit"
              className="send-button"
              disabled={!activeDoc || !message.trim() || loading}
            >
              ➔
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;