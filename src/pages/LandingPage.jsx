import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem("token");
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqData = [
    {
      question: "Is my document data secure?",
      answer: "Yes, absolutely. We enforce strict database-level schema query isolation. Your files, embeddings, and chat history are linked directly to your authenticated user account and cannot be accessed by anyone else."
    },
    {
      question: "How does visual citation page mapping work?",
      answer: "Unlike general RAG chatbots that guess source text, we ingest your PDF page-by-page. During vector retrieval, the matching segments return the exact page number they were extracted from, displaying them as clickable clipboard citation cards."
    },
    {
      question: "Can I use my own Gemini API Key?",
      answer: "Yes! If you hit standard server-side rate limits, you can enter your own Gemini API Key in the Profile page. It is stored completely locally in your browser's localStorage and never saved on our servers."
    },
    {
      question: "What PDF sizes or document lengths are supported?",
      answer: "We support documents up to 50MB. Text is processed dynamically using LangChain splitting configurations to handle multi-hundred page documents efficiently without losing model attention."
    }
  ];

  return (
    <div className="landing-container">
      {/* NAVBAR */}
      <nav className="landing-navbar">
        <div className="landing-logo">
          <span>📄</span> AI PDF RAG Chat
        </div>
        <div className="landing-nav-actions">
          {isAuthenticated ? (
            <button className="landing-nav-btn" onClick={() => navigate("/chat")}>
              Go to Workspace
            </button>
          ) : (
            <>
              <button className="landing-nav-btn text-btn" onClick={() => navigate("/login")}>
                Login
              </button>
              <button className="landing-nav-btn primary-btn" onClick={() => navigate("/register")}>
                Register
              </button>
            </>
          )}
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="landing-hero">
        <div className="hero-badge">🦜 Powered by LangChain & Gemini</div>
        <h1 className="hero-title">
          Unlock the Knowledge in Your <span className="text-gradient">PDF Documents</span>
        </h1>
        <p className="hero-subtitle">
          An advanced semantic document retrieval system. Upload multi-page PDFs, chat with individual files, and get instant answers with page-level citations and transparent AI reasoning.
        </p>
        <div className="hero-cta">
          {isAuthenticated ? (
            <button className="hero-btn primary-btn" onClick={() => navigate("/chat")}>
              🚀 Enter Chat Workspace
            </button>
          ) : (
            <button className="hero-btn primary-btn" onClick={() => navigate("/login")}>
              ⚡ Get Started for Free
            </button>
          )}
        </div>
      </header>

      {/* INTERACTIVE APP PREVIEW / MOCKUP */}
      <section className="landing-preview-section">
        <div className="preview-container">
          <div className="preview-header-bar">
            <div className="window-dots">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
            </div>
            <div className="window-address">workspace.ai-pdf-rag/chat</div>
          </div>
          <div className="preview-body-mock">
            {/* Mock Sidebar */}
            <div className="mock-sidebar">
              <div className="mock-sidebar-logo">📄 AI PDF RAG</div>
              <div className="mock-upload-zone">
                <span style={{ fontSize: "16px" }}>📤</span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Drag & Drop PDF</span>
              </div>
              <div className="mock-doc-list">
                <div className="mock-doc-item active">
                  <span>📄 Q3_Finance_Report.pdf</span>
                </div>
                <div className="mock-doc-item">
                  <span>📄 Research_Paper_2026.pdf</span>
                </div>
              </div>
            </div>
            {/* Mock Chat Area */}
            <div className="mock-chat-area">
              <div className="mock-chat-header">Chatting with: Q3_Finance_Report.pdf</div>
              <div className="mock-chat-messages">
                <div className="mock-message user">
                  <div className="mock-bubble">What was the Q3 revenue increase?</div>
                </div>
                <div className="mock-message ai">
                  <div className="mock-bubble">
                    The Q3 revenue increased by <strong>14.2% year-over-year</strong>, driven by software subscriptions and enterprise API integrations.
                  </div>
                  {/* Mock Thinking accordion */}
                  <div className="mock-thinking">
                    <div className="mock-thinking-header">🤔 Show Thinking Process (Expanded)</div>
                    <div className="mock-thinking-body">
                      1. Retrieved 3 semantic chunks from 'Q3_Finance_Report.pdf'.<br />
                      2. Extracted revenue growth figures on page 3.<br />
                      3. Formulating response indicating a 14.2% increase...
                    </div>
                  </div>
                  {/* Mock Citation */}
                  <div className="mock-citation">
                    <div className="mock-citation-badge">📄 Page 3</div>
                    <div className="mock-citation-text">
                      "...our software subscription segment saw a surge of 22%, pushing our total Q3 revenue growth to 14.2% year-over-year..."
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="landing-features">
        <h2 className="section-header">Engineered for Precision & Security</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🦜</div>
            <h3>LangChain RAG</h3>
            <p>Orchestrates document loading, text splitting, and vector retrieval chains for accurate responses.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔐</div>
            <h3>Multi-User Isolation</h3>
            <p>Your PDFs are yours. Secure JWT-based auth isolates all files and messages on database-level query schemas.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📄</div>
            <h3>Visual Citations</h3>
            <p>Hoverable source chunks mapped to exact page numbers with 1-click clipboard copy features.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🤔</div>
            <h3>Model Reasoning UI</h3>
            <p>Collapsible accordions displaying the step-by-step thinking process of the Gemini model.</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="landing-workflow">
        <h2 className="section-header">How it Works</h2>
        <div className="workflow-steps">
          <div className="workflow-step">
            <div className="step-num">01</div>
            <h4>Secure Upload</h4>
            <p>Upload multi-page PDFs. Documents are securely mapped to your user account database records.</p>
          </div>
          <div className="workflow-step">
            <div className="step-num">02</div>
            <h4>LangChain Chunking</h4>
            <p>Our document pipeline splits text page-by-page, calculating semantic embeddings and storing page offsets.</p>
          </div>
          <div className="workflow-step">
            <div className="step-num">03</div>
            <h4>Vector Querying</h4>
            <p>When you ask a question, we execute a database vector retrieval to find relevant text chunks with user isolation.</p>
          </div>
          <div className="workflow-step">
            <div className="step-num">04</div>
            <h4>Citations & Thinking</h4>
            <p>Gemini processes the context, displaying its step-by-step reasoning log alongside precise page-level citations.</p>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="landing-faq">
        <h2 className="section-header">Frequently Asked Questions</h2>
        <div className="faq-container">
          {faqData.map((faq, index) => (
            <div key={index} className={`faq-item ${activeFaq === index ? "open" : ""}`} onClick={() => toggleFaq(index)}>
              <div className="faq-question">
                <h3>{faq.question}</h3>
                <span className="faq-toggle-icon">✕</span>
              </div>
              <div className="faq-answer">
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BOTTOM CTA BANNER */}
      <section className="landing-cta-banner">
        <div className="cta-banner-card">
          <h2>Ready to Supercharge Your PDF Reading?</h2>
          <p>Get precise answers with page-level citations and transparent model reasoning in seconds.</p>
          <div className="hero-cta" style={{ margin: "20px 0 0 0" }}>
            {isAuthenticated ? (
              <button className="hero-btn primary-btn" onClick={() => navigate("/chat")}>
                🚀 Enter Chat Workspace
              </button>
            ) : (
              <button className="hero-btn primary-btn" onClick={() => navigate("/login")}>
                ⚡ Get Started for Free
              </button>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <p>© 2026 AI PDF RAG Chatbot. Built with LangChain, Node.js, Gemini API, and MongoDB.</p>
      </footer>
    </div>
  );
}

export default LandingPage;
