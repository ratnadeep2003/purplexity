# Purplexity 

> An AI-powered search and answer engine inspired by Perplexity, combining real-time web search with Gemini reasoning, interactive source citations, follow-up exploration, and Supabase OAuth synchronization.

---

##  Features

- ** Real-Time Web Search & Synthesis**: Leverages Tavily Search API for deep web retrieval and Google Gemini (`gemini-3.5-flash-lite`) to synthesize answers with accurate citations.
- ** Streaming Responses**: Low-latency token streaming with markdown formatting, syntax-highlighted code blocks, and structured `<ANSWER>` parsing.
- ** Interactive Source Cards**: Clean grid of source citations showing site favicons, domain names, preview titles, and direct external links.
- ** Conversational Follow-Ups**: Dynamically extracted related questions (`<FOLLOW-UPS>`) rendered as clickable chips to explore topics deeper in the same thread.
- ** Persistent Search Threads**: Conversations and message history are automatically saved into PostgreSQL via Prisma ORM.
- ** Robust Supabase Authentication**: Supports Google and GitHub OAuth with automatic background synchronization between Supabase Auth (`auth.users`) and the PostgreSQL `User` database table.
- ** Sleek Perplexity UI**: Modern dark-themed layout with a collapsible sidebar, `Ctrl+K` shortcuts, focus modes (*Web Search*, *Academic*, *Code*, *Writing*), and live database sync badges.

---

##  Tech Stack

### Frontend
- **Runtime & Bundler**: [Bun](https://bun.sh/)
- **Framework**: React 19, React Router 8
- **Styling**: Tailwind CSS v4, `lucide-react` icons
- **Auth Client**: `@supabase/supabase-js`, `@supabase/ssr`
- **HTTP**: Axios

### Backend
- **Runtime**: Bun / Node.js
- **Server**: Express
- **Database & ORM**: PostgreSQL (hosted on [Supabase](https://supabase.com/)), Prisma ORM 7
- **AI & Web Search**: `@ai-sdk/google` (Gemini 3.5 Flash Lite), `@tavily/core` (Tavily Search API)
- **Auth**: Supabase Auth (JWT verification & custom upsert middleware)

---

## 📁 Project Structure

```
purplexity/
├── backend/
│   ├── prisma/
│   │   ├── migrations/          # Prisma database migrations
│   │   ├── schema.prisma        # Database schema (User, Conversation, Message)
│   │   └── supabase_trigger.sql # Optional Supabase SQL trigger for DB-level sync
│   ├── client.ts                # Supabase server client
│   ├── db.ts                    # Prisma client with PostgreSQL adapter
│   ├── index.ts                 # Express API routes & streaming logic
│   ├── middleware.ts            # Supabase auth token verification & user upsert
│   ├── prompt.ts                # AI system prompt and answer/follow-up template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SearchHero.tsx   # "Where knowledge begins" hero search box
│   │   │   ├── Sidebar.tsx      # Collapsible sidebar with thread history & profile
│   │   │   └── ThreadView.tsx   # Answer stream, source cards, follow-up chips
│   │   ├── pages/
│   │   │   ├── Auth.tsx         # Google & GitHub OAuth login page
│   │   │   └── Dashboard.tsx    # Main application state & streaming controller
│   │   ├── lib/
│   │   │   ├── client.ts        # Supabase browser client
│   │   │   └── config.ts        # Backend URL configuration
│   │   ├── App.tsx              # Router setup
│   │   ├── frontend.tsx         # React root entry point
│   │   ├── index.css            # Custom styling & Tailwind import
│   │   └── index.html           # HTML template
│   └── package.json
│
└── README.md
```

---

##  Environment Configuration

### Backend (`backend/.env`)

Create a `.env` file in the `backend/` directory:

```env
# Web Search & AI Keys
TAVILY_API_KEY="your-tavily-api-key"
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key"

# Database Connection (Supabase Postgres)
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@<pooler-host>:5432/postgres"

# Supabase Auth Secrets
SUPABASE_API_SECRET="your-supabase-service-role-secret"
GITHUB_OAUTH_CLIENT_ID="your-github-client-id"
GITHUB_OAUTH_SECRET="your-github-client-secret"
```

### Frontend (`frontend/.env`)

Create a `.env` file in the `frontend/` directory:

```env
BUN_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"
```

---

##  Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (v1.2+) installed on your machine.

### 1. Start the Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
bun install

# Generate Prisma client
bun run prisma generate

# Start the backend server (runs on port 3001)
bun run index.ts
```

### 2. Start the Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
bun install

# Start development server with hot-reloading (runs on port 3000)
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

##  API Endpoints

| Method | Route | Auth Required | Description |
|---|---|:---:|---|
| `GET` | `/auth/me` | Yes | Verifies token, upserts user, and returns profile & sync status |
| `POST` | `/auth/sync` | Yes | Triggers manual synchronization of current user into `User` table |
| `GET` | `/conversations` | Yes | Retrieves list of all past search threads for the user |
| `GET` | `/conversation/:conversationId` | Yes | Retrieves a specific conversation with all message turns |
| `POST` | `/purplexity_ask` | Yes | Performs Tavily search, creates conversation, and streams AI answer |
| `POST` | `/purplexity_ask/follow_up` | Yes | Performs search for a follow-up query and appends to existing thread |

---

##  Database Schema

```prisma
model User {
  id            String         @id @default(uuid())
  email         String
  provider      AuthProvider
  name          String
  supabaseId    String 
  conversations Conversation[]
}

model Conversation {
  id        String    @id @default(uuid())
  title     String?
  slug      String
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  messages  Message[]
}

model Message {
  id              Int          @id @default(autoincrement())
  content         String
  role            MessageRole
  converstaionId  String
  conversation    Conversation @relation(fields: [converstaionId], references: [id])
  createdAt       DateTime     @default(now())
}

enum MessageRole {
  User 
  Assistant
}

enum AuthProvider {
  Github
  Google
}
```

> **Optional Database Trigger**: To mirror new sign-ups from `auth.users` directly to `public."User"` inside Supabase even without backend requests, execute the script located in [`backend/prisma/supabase_trigger.sql`](file:///d:/Ratnadeep/projects/purplexity/backend/prisma/supabase_trigger.sql) in your Supabase SQL Editor.

---

##  License

MIT License. Built for fast, intelligent knowledge retrieval.
