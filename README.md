# Data Room

A full-stack Data Room MVP for securely storing, organizing, viewing, and sharing PDF documents.

**Tech stack:** React + TypeScript + Tailwind CSS (frontend), NestJS + Prisma (backend), PostgreSQL, Cloudflare R2.

**Live:** https://data-room-uupw.onrender.com (frontend), https://data-room-backend-wy1w.onrender.com (backend)

Health check: `GET https://data-room-backend-wy1w.onrender.com/health` → `{ "status": "ok" }`

---

## Features

- JWT authentication with email/password
- Data Rooms with nested folders
- PDF upload directly to Cloudflare R2
- PDF preview and download
- Cursor-based pagination
- Public and private sharing
- Viewer/editor roles
- Backend-enforced authorization
- Responsive React UI

---

## Design Decisions

### Architecture
- **Direct-to-R2 uploads:** Files are uploaded straight from the browser to Cloudflare R2 via presigned URLs. The backend never proxies binary data.
- **PostgreSQL for metadata only:** Binary PDFs live in R2. The database stores file metadata, folder hierarchy, users, and shares.
- **JWT auth with email/password:** Simple stateless authentication. No OAuth or sessions.
- **SPA with client-side routing:** React Router handles all routes. Render serves `index.html` for every path via a single rewrite rule (`/* → /index.html`).
- **Backend-enforced authorization:** the frontend controls navigation and UX, but every protected backend operation validates authentication and permissions server-side.

### Why these choices?
- R2 keeps file storage independent of the backend deployment lifecycle (Render ephemeral filesystem).
- Presigned URLs reduce backend bandwidth and give per-file upload progress.
- PostgreSQL stores the relational metadata where constraints and transactions matter for folders, files, users, and shares.
- A single `Share` model (polymorphic `resourceType` + `resourceId`) avoids three separate sharing systems and makes adding roles like `EDITOR` straightforward later. The tradeoff is that PostgreSQL cannot enforce a foreign key for the polymorphic `resourceId`; the application layer owns that validation.
- **Cursor-based pagination:** The frontend loads only the current page of folders/files instead of the entire Data Room.

---

## Setup Instructions

### Prerequisites
- Node.js >= 18
- PostgreSQL
- Cloudflare R2 bucket
- Render account (for deployment)

### Environment Variables

**Backend (`backend/.env`):**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/data_room"
JWT_SECRET="your-jwt-secret"
FRONTEND_URL="http://localhost:5173"
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="your-bucket-name"
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL="http://localhost:3001"
```

### Local Development

```bash
# Backend
cd backend
npm install
npm run prisma:migrate
npm run start:dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Production Deployment

Deployed on Render:
- **Backend:** NestJS web service — build command `cd backend && npm install && npm run build && npm run prisma:migrate:deploy`, start command `cd backend && npm run start:prod`
- **Frontend:** Static site — build command `cd frontend && npm install && npm run build`, static publish path `frontend/dist`, with SPA rewrite rule `/* → /index.html`
- **Database:** Managed PostgreSQL

Environment variables are configured directly in the Render dashboard for each service. `FRONTEND_URL` on the backend must match the exact frontend origin. `JWT_SECRET` should be a stable generated value (not a fallback).

### Database Migrations

```bash
cd backend
npx prisma migrate deploy
```

---

## Data Model

### ERD

```mermaid
erDiagram
    USER ||--o{ DATA_ROOM : owns
    DATA_ROOM ||--|| FOLDER : contains_root
    DATA_ROOM ||--o{ FOLDER : contains
    FOLDER ||--o{ FOLDER : contains
    FOLDER ||--o{ FILE : contains
    USER ||--o{ SHARE : receives

    USER {
        uuid id PK
        string email UK
        string passwordHash
        datetime createdAt
        datetime updatedAt
    }

    DATA_ROOM {
        uuid id PK
        uuid ownerId FK
        string name
        datetime createdAt
        datetime updatedAt
    }

    FOLDER {
        uuid id PK
        uuid dataRoomId FK
        uuid parentId FK
        string name
        datetime createdAt
        datetime updatedAt
    }

    FILE {
        uuid id PK
        uuid folderId FK
        uuid uploadedById FK
        string name
        string storageKey UK
        string mimeType
        bigint sizeBytes
        string status
        datetime createdAt
        datetime updatedAt
    }

    SHARE {
        uuid id PK
        string resourceType
        uuid resourceId
        uuid recipientUserId FK
        string accessType
        string role
        string tokenHash
        datetime createdAt
        datetime revokedAt
    }
```

> Note: `Share.resourceId` is polymorphic (can point to a `DataRoom`, `Folder`, or `File`) and is therefore not represented as a foreign key in the ERD.

### Key Constraints
- `User.email` is unique
- `File.storageKey` is unique (one DB record per R2 object)
- `File.(folderId, name)` is unique (no duplicate filenames in a folder)
- `Folder.(parentId, name)` is unique (no duplicate folder names in a parent)

---

## Scaling Considerations

### 1. Computing total size and item count of a folder including its subtree

**Current implementation:** folder statistics are calculated recursively from the folder tree using a recursive CTE:

```sql
WITH RECURSIVE descendants AS (
  SELECT id FROM Folder WHERE id = :folderId
  UNION ALL
  SELECT f.id FROM Folder f
  INNER JOIN descendants d ON f.parentId = d.id
)
SELECT COUNT(*), SUM(sizeBytes)
FROM File
WHERE folderId IN (SELECT id FROM descendants);
```

**If scaling further:** I would consider maintaining denormalized folder aggregates (`totalFileCount`, `totalSizeBytes`) updated when files are created, deleted, moved, or uploaded. This makes folder statistics an O(1) read at the cost of additional work when files or folders are created, deleted, or moved.

### 2. Scaling a Data Room to 100,000 files

**Listing:** The API returns only the current folder's direct children using cursor pagination (`?limit=50&cursor=...`), so the frontend never loads the entire Data Room.

**Indexes:** The following indexes keep queries fast:
- `File.folderId` — for listing a folder's files
- `File.(folderId, name)` — for conflict checks
- `Folder.parentId` — for subtree traversal
- `Folder.dataRoomId` — for Data Room scoping
- `Share.(resourceType, resourceId)` — for permission checks

**R2:** Objects are stored independently from the application server. The `storageKey` path (`rooms/{roomId}/files/{fileId}/{name}.pdf`) provides logical organization without relying on filesystem storage.

### 3. How does sharing extend to per-user roles without remodeling?

The current `Share` model already supports roles:

```ts
Share {
  role: "VIEWER" | "EDITOR"
}
```

The `role` field determines what operations the share grants:

| Role | Capabilities |
|------|-------------|
| VIEWER | view, download |
| EDITOR | view, download, upload, rename, move, create folders, delete |

Authorization is checked in the backend's `AuthorizationService` based on the share's role. No schema changes are needed. Adding an `OWNER` role or custom permissions later would follow the same pattern: add a role value, update the authorization checks, and optionally expose role selection in the `ShareDialog` UI.

---

## What I Learned

The most interesting parts of the project were the boundaries between systems rather than the CRUD operations themselves:

- Designing authorization for both authenticated users and public share links
- Uploading files directly to object storage without proxying them through the API
- Keeping database metadata and R2 objects consistent
- Handling SPA routing correctly in production
- Designing pagination so the UI doesn't depend on the total size of a Data Room

---

## Request Flow

### Upload

Browser → NestJS API → presigned R2 URL → R2

The backend creates the file metadata and generates a presigned upload URL. The browser uploads the PDF directly to R2, then notifies the backend that the upload is complete.

### Viewing

Browser → NestJS API → authorization check → presigned R2 URL → browser

The backend verifies that the user or share has access before generating a temporary URL for the file.

---

## AI Usage

AI tools were used throughout development as a pair-programming and productivity tool. I primarily used Cursor with different models and modes, along with MCP integrations for project context and development tooling. Other AI models were also used when useful for implementation, debugging, and technical exploration.

AI was used for:
- boilerplate and implementation assistance
- debugging and troubleshooting
- exploring implementation approaches
- code and architecture review
- documentation

All generated code was reviewed, tested, and adapted before being integrated.