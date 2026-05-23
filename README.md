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
