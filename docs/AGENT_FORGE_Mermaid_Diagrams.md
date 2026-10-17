# AGENT_FORGE — Mermaid Architecture & Project Flow

> Consolidated Mermaid source for the AGENT_FORGE diagrams discussed in our conversation. These diagrams distinguish the current authentication setup from proposed improvements. Verify exact route behavior and persistence against the current source before treating every detail as implemented.

## 1. Current authentication flow

```mermaid
flowchart TD
    A[Visitor opens AGENT_FORGE] --> B[React + Vite frontend]
    B --> C{Has valid session?}
    C -- Yes --> D[Open protected workspace]
    C -- No --> E[Show Login page]
    E --> F[Enter application password]
    F --> G[POST /api/auth/login]
    G --> H{Password valid?}
    H -- No --> I[Show login error]
    I --> E
    H -- Yes --> J[FastAPI sets signed HttpOnly session cookie]
    J --> K[Frontend checks /api/auth/session]
    K --> L[Browser sends cookie with credentials include]
    L --> M[GET /api/agents or another protected endpoint]
    M --> N{Cookie valid and not expired?}
    N -- Yes --> O[Return protected API response]
    N -- No --> P[401 Authentication required]
    P --> E
```

## 2. High-level application architecture

```mermaid
flowchart TB
    U[Visitor / User] --> FE
    subgraph FRONTEND[Frontend — React + Vite]
        FE[React application and routing]
        PUB[Public pages: Home, Learn, Resources]
        LOGIN[Login / Session UI]
        WORK[Workspace: Builder, My Agents, Knowledge, History, Dashboard]
        API[API helper: src/utils/api.ts]
        FE --> PUB
        FE --> LOGIN
        FE --> WORK
        LOGIN --> API
        WORK --> API
    end
    API -->|HTTP requests + credentials include| BE
    subgraph BACKEND[Backend — FastAPI]
        BE[FastAPI application]
        AUTH[Auth endpoints: login, session, logout]
        GUARD[Session-cookie validation]
        ROUTES[Protected API routers]
        AGENT[Agent / saved-agent / knowledge logic]
        BE --> AUTH
        BE --> GUARD
        GUARD -->|Valid session| ROUTES
        ROUTES --> AGENT
    end
    AGENT --> GEM[Gemini service]
    AGENT --> OLLAMA[Ollama service]
    AGENT --> STORE[(Persistence / database layer)]
    GUARD -->|Missing or invalid cookie| ERR[401 Unauthorized]
```

## 3. Recommended public-to-workspace journey

> Proposal: visitors should understand what the product does before being asked to sign in. Public pages can remain accessible while private workspace actions require authentication.

```mermaid
flowchart TD
    A[Open public product link] --> B[Polished AGENT_FORGE landing page]
    B --> C[Explore learning path]
    B --> D[Try safe demo]
    B --> E[Sign in / Open workspace]
    E --> F{Valid session?}
    F -- Yes --> G[Private workspace]
    F -- No --> H[Login page]
    H --> I[Submit password]
    I --> J{Login successful?}
    J -- No --> K[Show helpful error]
    K --> H
    J -- Yes --> L[Create session cookie]
    L --> G
    G --> M[Builder]
    G --> N[My Agents]
    G --> O[Knowledge]
    G --> P[Execution History]
    G --> Q[Dashboard]
```

## 4. Protected API request and cookie validation

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as React frontend
    participant Browser
    participant API as FastAPI
    participant Auth as Auth dependency
    participant Route as Protected API route
    User->>UI: Sign in with application password
    UI->>API: POST /api/auth/login
    API->>API: Validate configured password
    API-->>Browser: 200 OK + Set-Cookie (HttpOnly session)
    Browser-->>UI: Login response
    UI->>Browser: Fetch /api/agents with credentials: include
    Browser->>API: GET /api/agents + cookie (if browser sends it)
    API->>Auth: Validate cookie and expiry
    alt Session valid
        Auth-->>Route: Allow request
        Route-->>API: Agent data
        API-->>UI: 200 OK
    else Cookie missing or invalid
        Auth-->>API: Reject request
        API-->>UI: 401 Authentication required
    end
    User->>UI: Log out
    UI->>API: POST /api/auth/logout
    API-->>Browser: Delete session cookie
    API-->>UI: Logged out
```

## 5. Route boundaries (recommended access policy)

```mermaid
flowchart LR
    subgraph PUBLIC[Public — recommended]
        HOME["/ — Landing page"]
        LEARN["/learn and /learn/:id"]
        RES["/resources"]
        LOGIN["/login"]
        DEMO[Safe demo]
    end
    subgraph GATED[Authentication boundary]
        AUTH{Valid session?}
    end
    subgraph PRIVATE[Protected workspace — recommended]
        BUILDER["/builder (or private actions within it)"]
        AGENTS["/agents"]
        KNOWLEDGE["/knowledge"]
        HISTORY["/history"]
        DASH["/dashboard"]
    end
    HOME --> AUTH
    DEMO --> AUTH
    LOGIN --> AUTH
    AUTH -->|Authenticated| BUILDER
    AUTH -->|Authenticated| AGENTS
    AUTH -->|Authenticated| KNOWLEDGE
    AUTH -->|Authenticated| HISTORY
    AUTH -->|Authenticated| DASH
    AUTH -->|Not authenticated| LOGIN
```

> This is a proposed product policy, not a claim that these exact route guards are all implemented now.

## 6. Git worktrees and safe change flow

```mermaid
flowchart TD
    MAIN["Main working directory<br/>D:/AGENT_FORGE01/AGENT_FORGE<br/>feature/cookie-auth"]
    W1["Worktree: agent-forge-sync-audit-plan"]
    W2["Worktree: pasted-text-processing"]
    W3["Worktree: pasted-text-processing-69ad3b4d"]
    MAIN -. separate checkout .- W1
    MAIN -. separate checkout .- W2
    MAIN -. separate checkout .- W3
    CHECK["Identify current directory: pwd"]
    STATUS["Inspect: git status --short"]
    DIFF["Review changes: git diff"]
    SAFE["Decide deliberately what to copy, merge, or commit"]
    W1 --> CHECK
    W2 --> CHECK
    W3 --> CHECK
    MAIN --> CHECK
    CHECK --> STATUS --> DIFF --> SAFE
```

A change made in one worktree does not automatically appear in another worktree's working files. Preserve uncommitted modifications and backup/patch files.

## 7. Development-to-showcase roadmap

```mermaid
flowchart TD
    A[Phase 1: Stable local baseline] --> B[Phase 2: Public landing page]
    B --> C[Phase 3: Public/private route boundaries]
    C --> D[Phase 4: Visual and responsive polish]
    D --> E[Phase 5: Security and data-ownership review]
    E --> F[Phase 6: Showcase deployment and clean-browser testing]
    A1[Verify login, refresh, logout, 401 behavior] --- A
    B1[Explain value; add Explore, Demo, Sign in] --- B
    C1[Protect private data and APIs] --- C
    D1[Typography, contrast, loading and error states] --- D
    E1[Cookie flags, CSRF/origin, session expiry, authorization] --- E
    F1[Safe demo data, documentation, deployment checks] --- F
```

## 8. Pre-showcase verification checklist

```mermaid
flowchart TD
    START([Start verification]) --> LAND{Landing page public?}
    LAND -- No --> FIX1[Fix public entry experience]
    LAND -- Yes --> LOGIN{Can user sign in?}
    FIX1 --> LOGIN
    LOGIN -- No --> FIX2[Fix login/session flow]
    LOGIN -- Yes --> REFRESH{Session survives refresh?}
    FIX2 --> LOGIN
    REFRESH -- No --> FIX3[Inspect cookie delivery and session check]
    REFRESH -- Yes --> LOGOUT{Logout blocks protected API?}
    FIX3 --> REFRESH
    LOGOUT -- No --> FIX4[Fix logout and server-side authorization]
    LOGOUT -- Yes --> DATA{Private data properly isolated?}
    FIX4 --> LOGOUT
    DATA -- No --> FIX5[Do not launch multi-user production yet]
    DATA -- Yes --> READY([Ready for broader showcase testing])
```

## Architecture notes

- Frontend: React + Vite, using `HashRouter` in the inspected `src/App.tsx`.
- API helper: `src/utils/api.ts`, with `credentials: "include"` in the discussed request helpers.
- Authentication routes: `backend/app/api/auth_routes.py`.
- Session validation: `backend/app/services/auth.py`.
- FastAPI app, CORS/origin checks, and protected router registration: `backend/app/main.py`.
- The current authentication design uses one configured application password. This can be suitable for a controlled demonstration, but it is not a complete multi-user account system and does not by itself provide per-user ownership or isolation.
- Before production, verify protected API/data paths, cookie settings, CSRF/origin protections, password management, and logout/session behavior.
