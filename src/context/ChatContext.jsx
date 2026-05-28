import { createContext, useState } from "react";
import api from "../api";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [chatHistories, setChatHistories] = useState({});
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);

  const messages = selectedDocId ? (chatHistories[selectedDocId] || []) : [];

  const setMessages = (update) => {
    if (!selectedDocId) return;
    setChatHistories((prev) => {
      const currentHistory = prev[selectedDocId] || [];
      const newHistory = typeof update === "function" ? update(currentHistory) : update;
      return {
        ...prev,
        [selectedDocId]: newHistory,
      };
    });
  };

  const deleteDocHistory = (docId) => {
    setChatHistories((prev) => {
      const copy = { ...prev };
      delete copy[docId];
      return copy;
    });
  };

  const fetchDocuments = async (logoutHandler) => {
    try {
      setDocsLoading(true);
      const res = await api.get("/documents");
      if (res.data.success) {
        setDocuments(res.data.documents);
        // Automatically select the first document if available and none selected
        if (res.data.documents.length > 0 && !selectedDocId) {
          setSelectedDocId(res.data.documents[0]._id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      if (error.response && error.response.status === 401 && logoutHandler) {
        logoutHandler();
      }
    } finally {
      setDocsLoading(false);
    }
  };

  const clearChatState = () => {
    setChatHistories({});
    setDocuments([]);
    setSelectedDocId("");
    setChatLoading(false);
    setDocsLoading(true);
    setUploadLoading(false);
    setDeleteLoading(null);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        setMessages,
        deleteDocHistory,
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
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
