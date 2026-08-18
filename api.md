````md
# Data Room MVP — API Contract

## 1. Purpose

This document defines the API contract between the frontend and backend.

The API contract is the source of truth for:

- request shapes;
- response shapes;
- HTTP methods;
- status codes;
- error formats;
- pagination;
- authentication;
- file upload/download flows;
- sharing behavior.

Frontend and backend implementations must follow this contract.

Implementation details may differ internally as long as the externally visible API remains compatible.

---

# 2. Base URL

Local development:

```text
http://localhost:3000/api
````

Production:

```text
https://<backend-domain>/api
```

The frontend should use an environment variable for the API base URL.

Example:

```text
VITE_API_URL=https://api.example.com/api
```

---

# 3. Authentication

The MVP uses email/password authentication with JWT.

Authenticated requests send:

```http
Authorization: Bearer <accessToken>
```

The backend validates the JWT before processing protected requests.

The frontend should treat authentication as invalid when the backend returns:

```http
401 Unauthorized
```

The MVP does not require refresh tokens.

The access token is short-lived.

Recommended expiration:

```text
30 minutes
```

Logout is handled client-side by removing the stored access token.

---

# 4. Standard Response Conventions

Successful responses use JSON unless otherwise specified.

Resources use camelCase field names.

Example:

```json
{
  "id": "uuid",
  "name": "Financials",
  "createdAt": "2026-08-18T12:00:00.000Z"
}
```

Dates are returned as ISO 8601 strings in UTC.

IDs are UUIDs.

---

# 5. Error Format

All API errors should use a consistent structure:

```json
{
  "code": "FILE_NAME_CONFLICT",
  "message": "A file with this name already exists in the folder."
}
```

Optional validation details may be included:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed.",
  "details": {
    "email": "Invalid email address."
  }
}
```

The frontend should use `code` for predictable behavior and `message` for user-facing feedback.

---

# 6. Common HTTP Status Codes

```text
200 OK
Successful request.

201 Created
Resource was successfully created.

204 No Content
Successful request with no response body.

400 Bad Request
Invalid request.

401 Unauthorized
User is not authenticated or token is invalid/expired.

403 Forbidden
User is authenticated but does not have permission.

404 Not Found
Resource does not exist or is not accessible.

409 Conflict
Resource conflicts with existing data.

413 Payload Too Large
File exceeds the maximum allowed size.

422 Unprocessable Entity
Request structure is valid but business validation failed.

500 Internal Server Error
Unexpected server error.
```

---

# 7. Error Codes

The following error codes should be used where applicable.

## Authentication

```text
AUTH_INVALID_CREDENTIALS
AUTH_EMAIL_ALREADY_EXISTS
AUTH_TOKEN_INVALID
AUTH_TOKEN_EXPIRED
```

## Folders

```text
FOLDER_NOT_FOUND
FOLDER_NAME_CONFLICT
FOLDER_ACCESS_DENIED
FOLDER_INVALID_PARENT
```

## Files

```text
FILE_NOT_FOUND
FILE_ACCESS_DENIED
FILE_NAME_CONFLICT
FILE_INVALID_TYPE
FILE_TOO_LARGE
FILE_UPLOAD_FAILED
FILE_NOT_READY
```

## Sharing

```text
SHARE_NOT_FOUND
SHARE_ALREADY_EXISTS
SHARE_RECIPIENT_NOT_FOUND
SHARE_INVALID_TOKEN
SHARE_REVOKED
SHARE_ACCESS_DENIED
```

## General

```text
VALIDATION_ERROR
RESOURCE_NOT_FOUND
ACCESS_DENIED
INTERNAL_ERROR
```

---

# 8. Authentication API

## POST /auth/register

Create a new user account.

### Request

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Validation

* email must be valid;
* email must be unique;
* password must contain at least 8 characters.

### Response

```http
201 Created
```

```json
{
  "user": {
    "id": "uuid",
    "email": "john@example.com"
  },
  "accessToken": "jwt-token"
}
```

A successful registration does not automatically create a Data Room unless explicitly implemented by the application flow.

---

## POST /auth/login

Authenticate an existing user.

### Request

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Response

```http
200 OK
```

```json
{
  "user": {
    "id": "uuid",
    "email": "john@example.com"
  },
  "accessToken": "jwt-token"
}
```

### Errors

```text
401 AUTH_INVALID_CREDENTIALS
```

---

## GET /auth/me

Return the currently authenticated user.

### Authentication

Required.

### Response

```http
200 OK
```

```json
{
  "id": "uuid",
  "email": "john@example.com"
}
```

---

# 9. Data Room API

## GET /rooms

Return Data Rooms owned by or accessible to the current user.

### Authentication

Required.

### Response

```http
200 OK
```

```json
{
  "rooms": [
    {
      "id": "uuid",
      "name": "Acme Acquisition",
      "ownerId": "uuid",
      "createdAt": "2026-08-18T12:00:00.000Z",
      "updatedAt": "2026-08-18T12:00:00.000Z"
    }
  ]
}
```

For the MVP, the application may primarily operate with one Data Room per user.

The API should nevertheless support multiple rooms.

---

## POST /rooms

Create a new Data Room.

The backend creates the Data Room and its root folder in the same database transaction.

### Request

```json
{
  "name": "Acme Acquisition"
}
```

### Response

```http
201 Created
```

```json
{
  "id": "uuid",
  "name": "Acme Acquisition",
  "ownerId": "uuid",
  "rootFolderId": "uuid",
  "createdAt": "2026-08-18T12:00:00.000Z",
  "updatedAt": "2026-08-18T12:00:00.000Z"
}
```

---

## GET /rooms/:roomId

Return Data Room metadata.

### Authentication

Required.

### Authorization

The user must:

* own the Data Room; or
* have access through a share.

### Response

```http
200 OK
```

```json
{
  "id": "uuid",
  "name": "Acme Acquisition",
  "ownerId": "uuid",
  "rootFolderId": "uuid",
  "createdAt": "2026-08-18T12:00:00.000Z",
  "updatedAt": "2026-08-18T12:00:00.000Z"
}
```

---

# 10. Folder API

## GET /folders/:folderId/contents

Return the direct contents of a folder.

This endpoint does NOT recursively return the entire subtree.

### Authentication

Required.

### Query parameters

```text
limit
cursor
```

Example:

```text
GET /folders/uuid/contents?limit=50&cursor=abc123
```

`limit`:

* default: 50
* maximum: 100

`cursor` is optional.

### Response

```http
200 OK
```

```json
{
  "folder": {
    "id": "uuid",
    "name": "Financials",
    "parentId": "uuid",
    "dataRoomId": "uuid"
  },
  "breadcrumbs": [
    {
      "id": "uuid",
      "name": "Acme Acquisition"
    },
    {
      "id": "uuid",
      "name": "Financials"
    }
  ],
  "folders": [
    {
      "id": "uuid",
      "name": "2025",
      "parentId": "uuid",
      "createdAt": "2026-08-18T12:00:00.000Z",
      "updatedAt": "2026-08-18T12:00:00.000Z"
    }
  ],
  "files": [
    {
      "id": "uuid",
      "name": "report.pdf",
      "sizeBytes": 2457600,
      "mimeType": "application/pdf",
      "status": "READY",
      "createdAt": "2026-08-18T12:00:00.000Z",
      "updatedAt": "2026-08-18T12:00:00.000Z"
    }
  ],
  "pagination": {
    "nextCursor": "abc123",
    "hasMore": true
  }
}
```

### Notes

The API returns only direct children.

For example:

```text
Financials/
├── 2024/
├── 2025/
└── report.pdf
```

The endpoint returns:

```text
2024
2025
report.pdf
```

It does not return files inside `2024` or `2025`.

The frontend requests their contents only when the user enters those folders.

---

## POST /folders

Create a folder.

### Request

```json
{
  "name": "2025",
  "parentId": "uuid"
}
```

### Authorization

The current user must have editor/write access to the parent folder.

In the MVP, only the Data Room owner has write access.

### Response

```http
201 Created
```

```json
{
  "id": "uuid",
  "name": "2025",
  "parentId": "uuid",
  "dataRoomId": "uuid",
  "createdAt": "2026-08-18T12:00:00.000Z",
  "updatedAt": "2026-08-18T12:00:00.000Z"
}
```

### Conflict

If the parent already contains a folder with the same name:

```http
409 Conflict
```

```json
{
  "code": "FOLDER_NAME_CONFLICT",
  "message": "A folder with this name already exists."
}
```

---

## PATCH /folders/:folderId

Rename a folder.

### Request

```json
{
  "name": "2025 Final"
}
```

### Response

```http
200 OK
```

```json
{
  "id": "uuid",
  "name": "2025 Final",
  "parentId": "uuid",
  "dataRoomId": "uuid",
  "createdAt": "2026-08-18T12:00:00.000Z",
  "updatedAt": "2026-08-18T12:00:00.000Z"
}
```

### Conflict

```http
409 Conflict
```

```json
{
  "code": "FOLDER_NAME_CONFLICT",
  "message": "A folder with this name already exists."
}
```

---

## DELETE /folders/:folderId

Delete a folder and its entire subtree.

### Authentication

Required.

### Authorization

Only a user with write/delete access may perform this operation.

For the MVP, this is the Data Room owner.

### Response

```http
204 No Content
```

### Behavior

Deleting a folder removes:

* the folder;
* nested folders;
* files in the subtree;
* corresponding R2 objects;
* related shares.

The frontend must show a confirmation dialog before calling this endpoint.

---

# 11. File Upload API

## POST /files/upload-url

Request a presigned R2 upload URL.

The backend does not receive the file contents.

### Request

```json
{
  "folderId": "uuid",
  "name": "report.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 2457600
}
```

### Validation

* folder must exist;
* user must have write access;
* MIME type must be `application/pdf`;
* filename must have a `.pdf` extension;
* size must not exceed 50 MB;
* filename must not conflict with an existing file in the folder.

### Response

```http
201 Created
```

```json
{
  "file": {
    "id": "uuid",
    "name": "report.pdf",
    "sizeBytes": 2457600,
    "mimeType": "application/pdf",
    "status": "PENDING"
  },
  "upload": {
    "url": "https://...",
    "method": "PUT",
    "expiresAt": "2026-08-18T12:15:00.000Z"
  }
}
```

The backend generates the R2 storage key.

The frontend must not construct storage keys itself.

### Conflict

If the folder already contains a file with the same name:

```http
409 Conflict
```

```json
{
  "code": "FILE_NAME_CONFLICT",
  "message": "A file with this name already exists in the folder."
}
```

The frontend should prompt the user to rename the file or cancel the upload.

---

# 12. Direct R2 Upload

After receiving the presigned URL, the frontend uploads the PDF directly to R2.

Conceptually:

```http
PUT <presigned-url>
Content-Type: application/pdf

<binary PDF data>
```

The frontend should track upload progress locally and display it per file.

Example:

```text
report.pdf       ████████████░░  82%
contract.pdf     ██████████████ 100%
financial.pdf    waiting...
```

The backend is not involved in the file byte transfer.

---

# 13. POST /files/:fileId/complete

Confirm that the R2 upload has completed.

### Request

```json
{}
```

The backend uses the file ID to determine the expected R2 object.

The backend should verify that the object exists in R2 before marking the file as ready where practical.

### Response

```http
200 OK
```

```json
{
  "id": "uuid",
  "name": "report.pdf",
  "sizeBytes": 2457600,
  "mimeType": "application/pdf",
  "status": "READY",
  "folderId": "uuid",
  "createdAt": "2026-08-18T12:00:00.000Z",
  "updatedAt": "2026-08-18T12:00:00.000Z"
}
```

### Failure

If the upload does not exist or cannot be verified:

```http
400 Bad Request
```

```json
{
  "code": "FILE_UPLOAD_FAILED",
  "message": "The uploaded file could not be verified."
}
```

The file may remain in `PENDING` or be marked `FAILED` depending on implementation.

---

# 14. File Status

Files use the following database states:

```text
PENDING
READY
FAILED
```

### PENDING

Metadata exists but the R2 upload has not been successfully completed.

### READY

File is available for viewing.

### FAILED

The upload failed and the file should not be treated as available.

The frontend should normally display only `READY` files in the regular file listing, or clearly indicate failed/pending uploads when appropriate.

---

# 15. GET /files/:fileId/view

Generate a temporary signed URL for viewing a PDF.

### Authentication

Required unless accessed through a public share flow.

### Authorization

The current user must have access to the file.

### Response

```http
200 OK
```

```json
{
  "url": "https://signed-r2-url...",
  "expiresAt": "2026-08-18T12:15:00.000Z"
}
```

The signed URL should have a short expiration.

The frontend uses this URL to display the PDF.

The R2 bucket remains private.

---

# 16. PATCH /files/:fileId

Rename a file.

### Request

```json
{
  "name": "final-report.pdf"
}
```

### Validation

* must remain a PDF;
* name must be valid;
* extension must remain `.pdf`;
* name must not conflict with another file in the same folder.

### Response

```http
200 OK
```

```json
{
  "id": "uuid",
  "name": "final-report.pdf",
  "folderId": "uuid",
  "sizeBytes": 2457600,
  "mimeType": "application/pdf",
  "status": "READY",
  "createdAt": "2026-08-18T12:00:00.000Z",
  "updatedAt": "2026-08-18T12:00:00.000Z"
}
```

Renaming a file does not change its R2 storage key.

### Conflict

```http
409 Conflict
```

```json
{
  "code": "FILE_NAME_CONFLICT",
  "message": "A file with this name already exists in the folder."
}
```

---

# 17. POST /files/:fileId/move

Move a file to another folder.

### Request

```json
{
  "destinationFolderId": "uuid"
}
```

### Validation

* source file must exist;
* destination folder must exist;
* user must have write access to destination;
* destination must belong to the same Data Room;
* filename must not conflict.

### Response

```http
200 OK
```

```json
{
  "id": "uuid",
  "name": "report.pdf",
  "folderId": "destination-folder-uuid",
  "sizeBytes": 2457600,
  "mimeType": "application/pdf",
  "status": "READY",
  "updatedAt": "2026-08-18T12:00:00.000Z"
}
```

Moving a file changes only its database `folderId`.

The R2 object does not move.

### Conflict

```http
409 Conflict
```

```json
{
  "code": "FILE_NAME_CONFLICT",
  "message": "A file with this name already exists in the destination folder."
}
```

---

# 18. DELETE /files/:fileId

Delete a file.

### Response

```http
204 No Content
```

The backend should:

1. authorize the operation;
2. remove the R2 object;
3. remove the database metadata.

The implementation must handle partial failures between PostgreSQL and R2.

---

# 19. Sharing API

## POST /shares

Create a share for a Data Room, folder, or file.

### Permissioned share

Request:

```json
{
  "resourceType": "FOLDER",
  "resourceId": "uuid",
  "accessType": "PRIVATE",
  "recipientEmail": "john@example.com",
  "role": "VIEWER"
}
```

### Public share

Request:

```json
{
  "resourceType": "FOLDER",
  "resourceId": "uuid",
  "accessType": "PUBLIC",
  "role": "VIEWER"
}
```

`recipientEmail` is required for `PRIVATE` shares.

`recipientEmail` must not be supplied for `PUBLIC` shares.

The MVP supports only:

```text
role = VIEWER
```

but the schema supports future roles such as:

```text
EDITOR
```

### Response — private share

```http
201 Created
```

```json
{
  "id": "uuid",
  "resourceType": "FOLDER",
  "resourceId": "uuid",
  "accessType": "PRIVATE",
  "role": "VIEWER",
  "recipient": {
    "id": "uuid",
    "email": "john@example.com"
  },
  "createdAt": "2026-08-18T12:00:00.000Z"
}
```

### Response — public share

```http
201 Created
```

```json
{
  "id": "uuid",
  "resourceType": "FOLDER",
  "resourceId": "uuid",
  "accessType": "PUBLIC",
  "role": "VIEWER",
  "url": "https://app.example.com/share/AbCdEf123",
  "createdAt": "2026-08-18T12:00:00.000Z"
}
```

The raw public token should not be stored in plaintext in the database.

The API may return the generated public URL only when the share is created.

---

# 20. Sharing Rules

Sharing a Data Room:

```text
Data Room
├── Folder A
│   └── File A
└── Folder B
    └── File B
```

grants access to the entire subtree.

Sharing Folder A grants:

```text
Folder A
└── File A
```

but not Folder B.

Sharing File A grants access only to File A.

A shared resource is read-only in the MVP.

---

# 21. GET /shares

Return shares relevant to the current owner.

### Optional query parameters

```text
resourceType
resourceId
```

Example:

```text
GET /shares?resourceType=FOLDER&resourceId=uuid
```

### Response

```http
200 OK
```

```json
{
  "shares": [
    {
      "id": "uuid",
      "resourceType": "FOLDER",
      "resourceId": "uuid",
      "accessType": "PRIVATE",
      "role": "VIEWER",
      "recipient": {
        "id": "uuid",
        "email": "john@example.com"
      },
      "createdAt": "2026-08-18T12:00:00.000Z",
      "revokedAt": null
    }
  ]
}
```

Revoked shares may remain visible so the owner can understand sharing history.

---

# 22. DELETE /shares/:shareId

Revoke access.

### Response

```http
204 No Content
```

The preferred implementation is to set:

```text
revokedAt = current timestamp
```

rather than physically deleting the Share record.

A revoked share must no longer grant access.

---

# 23. Public Share API

## GET /public/:token

Resolve a public share.

This endpoint does not require authentication.

Example:

```text
GET /public/AbCdEf123
```

### Response for shared folder

```json
{
  "share": {
    "resourceType": "FOLDER",
    "role": "VIEWER"
  },
  "folder": {
    "id": "uuid",
    "name": "Financials"
  }
}
```

### Response for shared Data Room

```json
{
  "share": {
    "resourceType": "DATA_ROOM",
    "role": "VIEWER"
  },
  "room": {
    "id": "uuid",
    "name": "Acme Acquisition",
    "rootFolderId": "uuid"
  }
}
```

### Response for shared file

```json
{
  "share": {
    "resourceType": "FILE",
    "role": "VIEWER"
  },
  "file": {
    "id": "uuid",
    "name": "report.pdf"
  }
}
```

The frontend can then use the public-share context to browse the shared subtree or view the shared file.

The public context must remain read-only.

---

## GET /public/:token/folders/:folderId/contents

Return the direct contents of a folder within a public share.

This endpoint does not require authentication.

The backend must verify that:

* the public token is valid and not revoked;
* the requested folder is the shared resource itself, or a descendant of the shared folder or Data Room root.

### Query parameters

Same as `GET /folders/:folderId/contents`:

```text
limit
cursor
```

Example:

```text
GET /public/AbCdEf123/folders/uuid/contents?limit=50
```

### Response

```http
200 OK
```

The response shape matches `GET /folders/:folderId/contents`:

```json
{
  "folder": {
    "id": "uuid",
    "name": "Financials",
    "parentId": "uuid",
    "dataRoomId": "uuid"
  },
  "breadcrumbs": [
    {
      "id": "uuid",
      "name": "Acme Acquisition"
    },
    {
      "id": "uuid",
      "name": "Financials"
    }
  ],
  "folders": [],
  "files": [],
  "pagination": {
    "nextCursor": null,
    "hasMore": false
  }
}
```

### Errors

```text
404 SHARE_INVALID_TOKEN
404 SHARE_NOT_FOUND
403 SHARE_REVOKED
403 SHARE_ACCESS_DENIED
404 FOLDER_NOT_FOUND
```

If the requested folder is outside the shared subtree, return:

```http
403 Forbidden
```

```json
{
  "code": "SHARE_ACCESS_DENIED",
  "message": "This folder is not part of the shared content."
}
```

---

# 24. Public File Viewing

For a public file share, the backend may return the file metadata and generate a short-lived R2 signed URL after validating the public token.

Example:

```text
GET /public/:token/file
```

Response:

```json
{
  "file": {
    "id": "uuid",
    "name": "report.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 2457600
  },
  "url": "https://signed-r2-url...",
  "expiresAt": "2026-08-18T12:15:00.000Z"
}
```

The signed R2 URL must remain temporary.

---

# 25. Public Folder Browsing

A public folder or Data Room share allows browsing its entire subtree.

Use `GET /public/:token/folders/:folderId/contents` to load folder contents inside the shared boundary.

For a Data Room share, the initial `folderId` is the room's `rootFolderId` returned by `GET /public/:token`.

For a folder share, the initial `folderId` is the shared folder's ID returned by `GET /public/:token`.

The public API must expose only content inside the shared subtree.

For example:

```text
Data Room
│
├── Financials      ← shared
│   ├── 2024
│   │   └── report.pdf
│   └── 2025
│       └── audit.pdf
│
└── HR
    └── salaries.pdf
```

The public user can access:

```text
Financials
2024
report.pdf
2025
audit.pdf
```

but cannot navigate to:

```text
HR
salaries.pdf
```

The backend must enforce this boundary.

---

# 26. Authorization Rules

Authorization must be enforced on the backend.

The frontend must never be trusted to enforce access.

Conceptually:

```text
canRead(user, resource)
```

returns true when:

```text
1. User owns the Data Room
OR
2. User has a direct permissioned share
OR
3. User has a share on an ancestor Data Room/folder
OR
4. Resource is accessed through a valid public share
```

For write operations in the MVP:

```text
Data Room owner only
```

Shared viewers cannot:

* upload;
* create folders;
* rename;
* move;
* delete;
* create/revoke shares.

---

# 27. Resource Ownership

The backend should derive the Data Room associated with a folder/file through its relationships.

Example:

```text
File
 ↓
Folder
 ↓
DataRoom
 ↓
Owner
```

Every mutation must verify that the current user has the required permission on the associated Data Room/resource.

Never trust a client-provided `ownerId`.

---

# 28. Breadcrumbs

Breadcrumbs are returned as part of the folder contents response.

Example:

```json
{
  "breadcrumbs": [
    {
      "id": "room-root",
      "name": "Acme Acquisition"
    },
    {
      "id": "financials",
      "name": "Financials"
    },
    {
      "id": "2025",
      "name": "2025"
    }
  ]
}
```

This allows the frontend to render:

```text
Acme Acquisition / Financials / 2025
```

without recursively requesting every parent folder.

---

# 29. File Name Conflict Strategy

File names must be unique within a folder.

The MVP uses a **409 Conflict** strategy for all file naming conflicts.

When upload, rename, or move would create a duplicate filename in the destination folder, the backend returns:

```http
409 Conflict
```

```json
{
  "code": "FILE_NAME_CONFLICT",
  "message": "A file with this name already exists in the destination folder."
}
```

The backend must not auto-rename files (for example, `report (1).pdf`).

The frontend must handle the conflict and let the user choose a different name or cancel the operation.

This strategy is consistent across upload, rename, and move.

---

# 30. Folder Name Conflict Strategy

Folder names must be unique within the same parent.

A conflicting folder name results in:

```http
409 Conflict
```

```json
{
  "code": "FOLDER_NAME_CONFLICT",
  "message": "A folder with this name already exists."
}
```

---

# 31. Pagination

Folder contents use cursor-based pagination.

Example:

```text
GET /folders/:folderId/contents?limit=50
```

Response:

```json
{
  "folders": [],
  "files": [],
  "pagination": {
    "nextCursor": "opaque-cursor",
    "hasMore": true
  }
}
```

The cursor is opaque to the frontend.

The frontend must not attempt to interpret or construct cursor values.

If there are no more results:

```json
{
  "pagination": {
    "nextCursor": null,
    "hasMore": false
  }
}
```

The backend should use indexed queries rather than loading the complete Data Room.

---

# 32. Maximum File Size

The MVP supports:

```text
PDF only
Maximum size: 50 MB
```

The limit must be enforced by the backend.

The frontend should also validate it before starting the upload to provide immediate feedback.

Backend rejection:

```http
413 Payload Too Large
```

```json
{
  "code": "FILE_TOO_LARGE",
  "message": "The maximum file size is 50 MB."
}
```

---

# 33. PDF Validation

The frontend checks:

```text
extension = .pdf
```

and:

```text
MIME = application/pdf
```

The backend must independently validate the upload metadata.

The frontend must never be treated as a security boundary.

Where practical, the backend should verify the uploaded object's content type/metadata before marking the file `READY`.

---

# 34. Concurrency and Database Constraints

Application-level conflict checks are not sufficient by themselves.

For example:

```text
Request A → check "report.pdf" does not exist
Request B → check "report.pdf" does not exist
Request A → create
Request B → create
```

The database should enforce the relevant uniqueness constraints where possible.

The backend should catch database constraint violations and return:

```http
409 Conflict
```

with the appropriate error code.

---

# 35. R2 Failure Handling

PostgreSQL and R2 cannot participate in the same database transaction.

Therefore, operations involving both systems must handle partial failures.

Upload flow:

```text
Create PENDING metadata
        ↓
Upload to R2
        ↓
Confirm upload
        ↓
Mark READY
```

If R2 upload fails:

```text
PENDING → FAILED
```

If R2 succeeds but confirmation fails, the backend should be able to retry or clean up the orphaned object.

For the MVP, simple explicit error handling is sufficient.

A production implementation could add asynchronous reconciliation/cleanup jobs.

---

# 36. Security Requirements

The backend must:

* never expose R2 credentials;
* never make the R2 bucket publicly readable;
* never trust frontend authorization;
* validate ownership/access on every protected resource;
* use short-lived signed URLs;
* hash public share tokens in the database;
* hash passwords securely;
* validate uploaded file type and size;
* avoid exposing resources based only on predictable IDs.

Changing:

```text
/files/123
```

to:

```text
/files/124
```

must never allow a user to access another user's file.

---

# 37. Frontend API Usage

The frontend should use a centralized API client.

Example conceptual structure:

```text
api/
├── client.ts
├── auth.ts
├── rooms.ts
├── folders.ts
├── files.ts
└── shares.ts
```

The API client should:

* attach authentication headers;
* parse API errors;
* handle 401 responses;
* provide typed request/response objects.

React components should not contain raw `fetch()` calls throughout the UI.

---

# 38. API Implementation Rules

When implementing a feature:

1. Follow the endpoint and data shape defined here.
2. Do not invent a second API shape for the same operation.
3. Keep authorization in the backend.
4. Keep R2 credentials in the backend.
5. Keep file contents in R2, not PostgreSQL.
6. Use database transactions for related PostgreSQL changes.
7. Return consistent error codes.
8. Validate all user input.
9. Preserve pagination behavior.
10. Keep frontend and backend types synchronized where practical.

If a requirement cannot be implemented cleanly with this API contract, update this document first rather than silently introducing an incompatible API.

---

# 39. Deployment Requirements

Deployment to a live environment is **required** for this MVP.

The application must be deployed to:

```text
Render
├── Frontend (static site or web service)
├── NestJS Backend (web service)
└── PostgreSQL (managed database)

Cloudflare
└── R2 Bucket (private, for PDF storage)
```

Requirements:

* the frontend must communicate with the backend over HTTPS;
* the backend must use Render environment variables for secrets;
* the R2 bucket must remain private;
* file upload and viewing must work end-to-end in the deployed environment.

Expected backend environment variables:

```text
DATABASE_URL
JWT_SECRET
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
FRONTEND_URL
```

Expected frontend environment variables:

```text
VITE_API_URL
```