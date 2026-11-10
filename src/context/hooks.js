import { createContext, useContext } from "react";

// Context objects and their hooks live apart from the provider components so
// Vite's fast refresh can hot-swap the providers.
export const AuthContext = createContext(null);
export const LibraryContext = createContext(null);
export const ChatContext = createContext(null);

export const useAuth = () => useContext(AuthContext);
export const useLibrary = () => useContext(LibraryContext);
export const useChat = () => useContext(ChatContext);
