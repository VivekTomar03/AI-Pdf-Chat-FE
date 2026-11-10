import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api, { apiUrl, authHeaders, handleUnauthorized } from "../lib/api";
import { readSseStream } from "../lib/sse";
import { ChatContext, useLibrary } from "./hooks";

let tempCounter = 0;
const tempId = (prefix) => `tmp-${prefix}-${++tempCounter}`;
const isTempId = (id) => typeof id === "string" && id.startsWith("tmp-");

// Conversations and their messages, cached per chat, plus any answers that are
// still streaming. Streams live here rather than in a page component so that
// moving around the app does not cut an answer off half-way.
//
//   threads[conversationId] = { status: "loading" | "ready" | "error", conversation, messages, error }
//   lists[scope]            = { status, items }  scope: a document id, "all", or "recent"
//   streaming[conversationId] = true while an answer is being written
export function ChatProvider({ children }) {
  const { refresh: refreshLibrary } = useLibrary();
  const [threads, setThreads] = useState({});
  const [lists, setLists] = useState({});
  const [streaming, setStreaming] = useState({});

  const controllers = useRef(new Map());
  // Streamed text is buffered and applied once per animation frame: one render
  // per frame instead of one per network chunk.
  const pending = useRef(new Map());
  const frame = useRef(0);
  // New chats whose first question is still in flight, by conversation id:
  // { scope, entry }. The server only lists a chat once its first question is
  // saved, so until then lists keep these entries whatever the server returns.
  const unsavedChats = useRef(new Map());

  useEffect(() => {
    const active = controllers.current;
    return () => {
      // Signing out unmounts this provider; stop every stream it owns.
      for (const controller of active.values()) controller.abort();
      cancelAnimationFrame(frame.current);
    };
  }, []);

  const patchMessage = useCallback((conversationId, messageId, update) => {
    setThreads((prev) => {
      const thread = prev[conversationId];
      if (!thread) return prev;
      return {
        ...prev,
        [conversationId]: {
          ...thread,
          messages: thread.messages.map((message) => (message._id === messageId ? update(message) : message)),
        },
      };
    });
  }, []);

  const flush = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    const batch = pending.current;
    if (!batch.size) return;
    pending.current = new Map();

    for (const [conversationId, { messageId, answer, thought }] of batch) {
      patchMessage(conversationId, messageId, (message) => ({
        ...message,
        content: message.content + answer,
        thought: message.thought + thought,
      }));
    }
  }, [patchMessage]);

  const buffer = useCallback(
    (conversationId, messageId, field, delta) => {
      const entry = pending.current.get(conversationId) || { messageId, answer: "", thought: "" };
      entry[field] += delta;
      pending.current.set(conversationId, entry);
      if (!frame.current) frame.current = requestAnimationFrame(flush);
    },
    [flush]
  );

  const loadList = useCallback(async (scope) => {
    try {
      const params = scope === "recent" ? { limit: 6 } : { documentId: scope };
      const res = await api.get("/conversations", { params });
      const items = res.data.conversations;
      const unsaved = [...unsavedChats.current.values()]
        .filter((chat) => chat.scope === scope && !items.some((item) => item._id === chat.entry._id))
        .map((chat) => chat.entry);
      setLists((prev) => ({ ...prev, [scope]: { status: "ready", items: [...unsaved, ...items] } }));
    } catch {
      setLists((prev) => ({ ...prev, [scope]: { status: "error", items: prev[scope]?.items || [] } }));
    }
  }, []);

  const loadThread = useCallback(async (conversationId) => {
    // A thread that is mid-answer is ahead of the server; never overwrite it.
    if (controllers.current.has(conversationId)) return;

    setThreads((prev) =>
      prev[conversationId]?.status === "ready"
        ? prev
        : { ...prev, [conversationId]: { messages: [], ...prev[conversationId], status: "loading" } }
    );

    try {
      const res = await api.get(`/conversations/${conversationId}`);
      setThreads((prev) =>
        controllers.current.has(conversationId)
          ? prev
          : {
              ...prev,
              [conversationId]: {
                status: "ready",
                conversation: res.data.conversation,
                messages: res.data.messages,
                error: "",
              },
            }
      );
    } catch (err) {
      setThreads((prev) => ({
        ...prev,
        [conversationId]: {
          messages: [],
          ...prev[conversationId],
          status: "error",
          error: err.response?.status === 404 ? "missing" : "failed",
        },
      }));
    }
  }, []);

  const send = useCallback(
    async (conversationId, question, scope) => {
      if (controllers.current.has(conversationId)) return;

      const userId = tempId("q");
      let answerId = tempId("a");
      const now = new Date().toISOString();

      setThreads((prev) => {
        const thread = prev[conversationId] || { status: "ready", messages: [], conversation: null };
        return {
          ...prev,
          [conversationId]: {
            ...thread,
            messages: [
              ...thread.messages,
              { _id: userId, role: "user", content: question, createdAt: now },
              {
                _id: answerId,
                role: "assistant",
                content: "",
                thought: "",
                searchQuery: "",
                sources: [],
                fallbacks: [],
                syncNotes: [],
                status: "streaming",
                error: "",
                createdAt: now,
              },
            ],
          },
        };
      });

      const controller = new AbortController();
      controllers.current.set(conversationId, controller);
      setStreaming((prev) => ({ ...prev, [conversationId]: true }));

      // Reads answerId at call time, so it follows the swap to the real id.
      const patchAnswer = (update) => patchMessage(conversationId, answerId, update);

      try {
        const res = await fetch(apiUrl(`/conversations/${conversationId}/messages`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ question }),
          signal: controller.signal,
        });

        // Validation, ownership and retrieval failures arrive as plain JSON;
        // only an accepted question switches the response to an event stream.
        if (!res.ok) {
          if (res.status === 401) handleUnauthorized();
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || "Your question could not be sent.");
        }

        await readSseStream(res, (event, data) => {
          if (event === "start") {
            patchMessage(conversationId, userId, (message) => ({ ...message, _id: data.userMessageId }));
          } else if (event === "fallback") {
            // Another key took over; the answer carries on in the same message.
            patchAnswer((message) => ({ ...message, fallbacks: [...(message.fallbacks || []), data] }));
          } else if (event === "sync") {
            // Linked Google files that were re-indexed, or couldn't be checked, first.
            patchAnswer((message) => ({ ...message, syncNotes: data.notes || [] }));
          } else if (event === "sources") {
            patchAnswer((message) => ({ ...message, sources: data.sources || [], searchQuery: data.searchQuery || "" }));
          } else if (event === "thought") {
            buffer(conversationId, answerId, "thought", data.delta);
          } else if (event === "answer") {
            buffer(conversationId, answerId, "answer", data.delta);
          } else if (event === "error") {
            flush();
            patchAnswer((message) => ({ ...message, error: data.message }));
          } else if (event === "done") {
            flush();
            patchAnswer((message) => ({ ...message, _id: data.messageId, status: data.status }));
            answerId = data.messageId;
          }
        });
      } catch (err) {
        flush();
        if (err.name === "AbortError") {
          patchAnswer((message) => ({ ...message, status: "stopped" }));
        } else {
          patchAnswer((message) => ({ ...message, status: "error", error: err.message }));
        }
      } finally {
        flush();
        // A stream that ended without a "done" event (dropped connection).
        patchAnswer((message) =>
          message.status === "streaming" ? { ...message, status: message.error ? "error" : "stopped" } : message
        );
        controllers.current.delete(conversationId);
        // Saved or failed, the server's list is now the truth for this chat.
        unsavedChats.current.delete(conversationId);
        setStreaming((prev) => {
          const next = { ...prev };
          delete next[conversationId];
          return next;
        });
        // Titles, counts and ordering changed on the server.
        loadList(scope);
        loadList("recent");
        refreshLibrary();
      }
    },
    [buffer, flush, loadList, patchMessage, refreshLibrary]
  );

  // Creates the chat first, then asks the question. Resolves with the new id as
  // soon as the chat exists, without waiting for the answer.
  const startConversation = useCallback(
    async (scope, question) => {
      const res = await api.post("/conversations", { documentId: scope });
      const conversation = res.data.conversation;
      setThreads((prev) => ({
        ...prev,
        [conversation._id]: { status: "ready", conversation: { ...conversation, title: question }, messages: [] },
      }));
      // List it under its file straight away. Until the answer finishes the
      // cached list would otherwise say this file has no chats, and opening the
      // file meanwhile would bounce to a new chat.
      const entry = { ...conversation, title: question, messageCount: 1, lastMessageAt: new Date().toISOString() };
      unsavedChats.current.set(conversation._id, { scope, entry });
      setLists((prev) =>
        prev[scope]
          ? { ...prev, [scope]: { ...prev[scope], items: [entry, ...prev[scope].items.filter((c) => c._id !== entry._id)] } }
          : prev
      );
      send(conversation._id, question, scope);
      return conversation._id;
    },
    [send]
  );

  // Re-asks a failed question. A pair that never reached the server (temp ids)
  // is removed first so it is not shown twice.
  const retry = useCallback(
    (conversationId, answerMessage, question, scope) => {
      setThreads((prev) => {
        const thread = prev[conversationId];
        if (!thread || !isTempId(answerMessage._id)) return prev;
        const index = thread.messages.findIndex((message) => message._id === answerMessage._id);
        const messages = thread.messages.filter((_, i) => i !== index && i !== index - 1);
        return { ...prev, [conversationId]: { ...thread, messages } };
      });
      send(conversationId, question, scope);
    },
    [send]
  );

  const stop = useCallback((conversationId) => {
    controllers.current.get(conversationId)?.abort();
  }, []);

  const deleteConversation = useCallback(
    async (conversationId, scope) => {
      controllers.current.get(conversationId)?.abort();
      await api.delete(`/conversations/${conversationId}`);
      setThreads((prev) => {
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });
      setLists((prev) => {
        const next = { ...prev };
        for (const key of [scope, "recent"]) {
          if (next[key]) next[key] = { ...next[key], items: next[key].items.filter((c) => c._id !== conversationId) };
        }
        return next;
      });
      refreshLibrary();
    },
    [refreshLibrary]
  );

  // After a document is deleted, drop everything cached for it.
  const forgetDocument = useCallback((documentId) => {
    setLists((prev) => {
      const next = { ...prev };
      delete next[documentId];
      if (next.recent) {
        next.recent = { ...next.recent, items: next.recent.items.filter((c) => c.documentId !== documentId) };
      }
      return next;
    });
    setThreads((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([, thread]) => thread.conversation?.documentId !== documentId))
    );
  }, []);

  const value = useMemo(
    () => ({
      threads,
      lists,
      streaming,
      loadList,
      loadThread,
      send,
      startConversation,
      retry,
      stop,
      deleteConversation,
      forgetDocument,
    }),
    [threads, lists, streaming, loadList, loadThread, send, startConversation, retry, stop, deleteConversation, forgetDocument]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
