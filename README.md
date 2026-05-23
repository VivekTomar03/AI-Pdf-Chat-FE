# AI PDF RAG Chat App - Architecture & Roadmap

# 🚀 Project Overview

We built a REAL mini RAG (Retrieval Augmented Generation) application using:

* React
* Node.js
* Gemini API
* MongoDB Atlas Vector Search

This project is not just a chatbot.
It is a semantic document retrieval system.

---

# ✅ CURRENT IMPLEMENTATION

---

# 1. React Frontend

Implemented:

* Chat UI
* Message state
* PDF upload UI
* Loading state
* API communication

---

# 2. Gemini AI Integration

Implemented:

* Gemini 2.5 Flash
* Conversational responses
* System instructions
* AI response generation

---

# 3. Multi-turn Chat

Implemented:

```js id="i5g6dr"
messages[]
```

Used for:

* conversation history
* contextual chat

---

# 4. PDF Upload

Implemented using:

```js id="ykj14m"
multer
```

Used for:

* multipart/form-data
* PDF uploads

---

# 5. PDF Text Extraction

Implemented using:

```js id="t4ol8r"
pdf-parse
```

Flow:

```txt id="x0hxrn"
PDF
↓
Extract raw text
```

---

# 6. Chunking

Implemented:

```js id="8wcc9k"
chunkText()
```

Purpose:

* split large text into smaller chunks

Example:

```txt id="wm4w2f"
Large PDF
↓
Chunk 1
Chunk 2
Chunk 3
```

---

# 7. Embeddings Generation

Implemented using:

```txt id="9ys0be"
gemini-embedding-2
```

Purpose:

* convert text into vectors

Example:

```txt id="v85np7"
Text
↓
[0.234, -0.992, 0.182...]
```

---

# 8. MongoDB Storage

Stored:

* chunk text
* embedding vectors

using:

```js id="b3ivcr"
mongoose
```

---

# 9. MongoDB Vector Search Index

Created vector index:

```json id="0h22yf"
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 3072,
      "similarity": "cosine"
    }
  ]
}
```

---

# 10. REAL RAG PIPELINE

Implemented:

```txt id="6ivrlx"
Question
↓
Question Embedding
↓
MongoDB Vector Search
↓
Relevant Chunks
↓
Gemini Context Answer
```

This is an actual RAG architecture.

---

# 🔥 CURRENT APPLICATION FLOW

```txt id="n1n16w"
Frontend
↓
Upload PDF
↓
Backend
↓
Extract Text
↓
Chunking
↓
Generate Embeddings
↓
Store Vectors
↓
MongoDB Vector Search
↓
Gemini Answer
↓
Frontend Response
```

---

# 🔌 API SPECIFICATION & INTEGRATION

This section documents the communication protocol between the React frontend and the Express backend.

## 1. Backend API (Base URL: `http://localhost:5000`)

### 📂 Document Management

#### A. Upload PDF Document
* **Endpoint:** `POST /upload-pdf`
* **Content-Type:** `multipart/form-data`
* **Request Payload:**
  * `pdf` (File): The PDF file to be uploaded and processed.
* **Flow:** Uploads PDF → Extracts text using `pdf-parse` → Chunks text using LangChain `RecursiveCharacterTextSplitter` → Embeds chunks using Gemini `gemini-embedding-2` → Saves document metadata & vectors to MongoDB Atlas Vector Search.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "documentId": "65bdf9...",
    "documentName": "financial_report.pdf",
    "totalChunks": 15
  }
  ```

#### B. Fetch All Documents
* **Endpoint:** `GET /documents`
* **Description:** Retrieves all uploaded PDF metadata records sorted by creation date (newest first).
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "documents": [
      {
        "_id": "65bdf9...",
        "name": "financial_report.pdf",
        "createdAt": "2026-05-23T14:12:21.000Z",
        "updatedAt": "2026-05-23T14:12:21.000Z",
        "__v": 0
      }
    ]
  }
  ```

#### C. Delete Document & Embeddings
* **Endpoint:** `DELETE /documents/:id`
* **Description:** Deletes the document metadata record and clears all associated chunk embeddings from the Vector Store.
* **URL Parameters:**
  * `id` (String): The MongoDB ObjectId (`_id`) of the document to delete.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Document and embeddings deleted"
  }
  ```

---

### 💬 Chat & Querying APIs

#### A. Ask PDF (RAG Query)
* **Endpoint:** `POST /ask-pdf`
* **Content-Type:** `application/json`
* **Request Body:**
  ```json
  {
    "question": "What are the Q3 highlights?",
    "documentId": "65bdf9..."
  }
  ```
* **Flow:** Generates query embedding → Searches MongoDB Atlas Vector Search (scoped to `documentId` if provided) → Passes matched chunks as context to `gemini-2.5-flash` → Generates localized answer.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "answer": "Q3 highlights include a 15% increase in revenue...",
    "matchedChunks": [
      {
        "text": "In Q3, revenue increased by 15% year-over-year...",
        "documentId": "65bdf9...",
        "createdAt": "..."
      }
    ]
  }
  ```

#### B. Direct Chat (General LLM)
* **Endpoint:** `POST /chat`
* **Content-Type:** `application/json`
* **Request Body:**
  ```json
  {
    "messages": [
      {
        "role": "user",
        "text": "Hello"
      }
    ]
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "reply": "Hello! How can I help you today?"
  }
  ```

---

## 2. Frontend API & Axios Integration

The client app is built using React and uses `axios` to coordinate API requests.

### 🌐 API Client Configuration
All request endpoints target `http://localhost:5000`.

### 🔄 React States Used (`src/App.jsx`):
* `documents` (Array): Stores metadata of all files.
* `selectedDocId` (String): ID of the currently selected PDF document.
* `messages` (Array): Active conversation history, containing `{ role: "user" | "ai", text: string, matchedChunks: Array }`.
* `loading` (Boolean): Controls spinner and disables buttons during network activities.

### 🔌 Main Integration Methods (`src/App.jsx`):

* **Fetch Documents (`fetchDocuments`):**
  ```javascript
  const res = await axios.get("http://localhost:5000/documents");
  if (res.data.success) {
    setDocuments(res.data.documents);
  }
  ```
* **Upload PDF (`uploadFile`):**
  ```javascript
  const formData = new FormData();
  formData.append("pdf", file);
  const res = await axios.post("http://localhost:5000/upload-pdf", formData);
  ```
* **Delete PDF (`deleteDocument`):**
  ```javascript
  const res = await axios.delete(`http://localhost:5000/documents/${id}`);
  ```
* **Submit RAG Question (`sendMessage`):**
  ```javascript
  const res = await axios.post("http://localhost:5000/ask-pdf", {
    question: currentQuestion,
    documentId: selectedDocId,
  });
  ```

---

# ⚠️ CURRENT PROBLEMS

---

# ❌ Problem 1 - All PDFs Are Mixed

Currently:

* all PDF vectors are stored together
* vector search searches the entire collection

Issue:

```txt id="b45z9x"
Resume A
Resume B
↓
Mixed Retrieval
```

This creates inaccurate results.

---

# ❌ Problem 2 - Duplicate Embeddings

Every upload:

```txt id="z5m2pw"
new vectors inserted
```

No cleanup exists.

Issue:

* duplicate vectors
* bloated database
* dirty retrieval

---

# ❌ Problem 3 - Weak Chunking

Current chunking:

```js id="ow1g1d"
text.slice()
```

Issues:

* broken sentences
* context loss
* weaker semantic retrieval

---

# ✅ LEVEL 1 IMPLEMENTATION PLAN

---

# 1. Add documentId

## Goal

Each uploaded PDF should have:

```txt id="phgbqf"
unique documentId
```

---

# Why?

This allows:

```txt id="2w8a4o"
chat with specific PDF
```

instead of searching all documents.

---

# Step-by-Step

---

## Step 1 - Update Schema

Add:

```js id="v03s0z"
documentId: {
   type: mongoose.Schema.Types.ObjectId,
},
```

---

## Step 2 - Generate documentId

Inside upload route:

```js id="ytf0m8"
const documentId =
   new mongoose.Types.ObjectId();
```

---

## Step 3 - Save documentId with every chunk

Example:

```js id="z5k95c"
const embeddingData = {
   documentId,
   text,
   embedding
}
```

---

# Final DB Structure

```js id="f9x8yn"
{
   documentId,
   text,
   embedding
}
```

---

# 2. Remove Duplicate Embeddings Properly

⚠️ IMPORTANT:
Do NOT delete the entire collection permanently.

Bad:

```js id="5nxd3i"
deleteMany({})
```

because:

* all previous PDFs disappear
* old chats stop working

---

# Correct Approach

Delete vectors only for ONE document.

Example:

```js id="fry75l"
await PdfEmbedding.deleteMany({
   documentId
});
```

---

# Why?

This allows:

* multiple PDFs
* clean retrieval
* old chats preserved

---

# ✅ LEVEL 2 IMPLEMENTATION

# Chat With Specific PDF

---

# Goal

User uploads:

```txt id="65bzhd"
PDF A
PDF B
```

Then:

```txt id="p4f5an"
chat only with selected PDF
```

---

# Current Problem

Current vector search:

```txt id="ryv1fi"
searches all PDFs
```

---

# Correct Solution

---

# Frontend

Store:

```js id="ch9v0e"
documentId
```

after upload.

---

# Upload Response

Backend should return:

```js id="2kv65m"
res.json({
   success: true,
   documentId
});
```

---

# Frontend State

Create:

```js id="mkg67v"
const [documentId, setDocumentId]
```

---

# Upload Success

Save:

```js id="opsgy9"
setDocumentId(
   res.data.documentId
);
```

---

# Ask Question API

Send:

```js id="0mjlwm"
{
   question,
   documentId
}
```

---

# Backend ask-pdf Route

Receive:

```js id="aw7gq7"
const {
   question,
   documentId
}
```

---

# Vector Search Filter

Inside:

```js id="ym7n7n"
$vectorSearch
```

add:

```js id="6g0xvw"
filter: {
   documentId:
      new mongoose.Types.ObjectId(
         documentId
      )
}
```

---

# Final RAG Flow

```txt id="wtymr6"
Question
↓
Question Embedding
↓
Search Only Inside Selected PDF
↓
Relevant Chunks
↓
Gemini Answer
```

---

# 🚀 AFTER LEVEL 1 & 2

Then we can implement:

* overlap chunking
* better retrieval
* streaming responses
* source citations
* LangChain integration

---

# 🔥 MOST IMPORTANT LEARNING

Before using LangChain:

* embeddings
* vector DB
* semantic retrieval
* chunking
* context engineering

must be understood clearly.

Now the architecture foundation is correct.
After this, frameworks like LangChain become useful instead of confusing.
