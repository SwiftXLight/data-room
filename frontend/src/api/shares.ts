import api from "./client";

export interface Share {
  id: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  accessType: string;
  role: string;
  recipient?: {
    id: string;
    email: string;
  };
  publicUrl?: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface CreateShareRequest {
  resourceType: "DATA_ROOM" | "FOLDER" | "FILE";
  resourceId: string;
  accessType: "PRIVATE" | "PUBLIC";
  role: "VIEWER";
  recipientEmail?: string;
}

export interface CreateShareResponse {
  id: string;
  resourceType: string;
  resourceId: string;
  accessType: string;
  role: string;
  recipient?: {
    id: string;
    email: string;
  };
  url?: string;
  createdAt: string;
}

export interface PublicShareResolveResponse {
  share: {
    resourceType: string;
    role: string;
  };
  room?: {
    id: string;
    name: string;
    rootFolderId: string;
  };
  folder?: {
    id: string;
    name: string;
  };
  file?: {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: string;
  };
}

export interface PublicFolderContentsResponse {
  folder: {
    id: string;
    name: string;
    parentId: string | null;
    dataRoomId: string;
  };
  breadcrumbs: { id: string; name: string }[];
  folders: {
    id: string;
    name: string;
    parentId: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
  files: {
    id: string;
    name: string;
    sizeBytes: string;
    mimeType: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export interface PublicFileViewResponse {
  file: {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: string;
  };
  url: string;
  expiresAt: string;
}

export interface SharedWithMeRoom {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  rootFolderId: string;
  shares: SharedWithMeShare[];
}

export interface SharedWithMeShare {
  shareId: string;
  accessType: string;
  role: string;
  createdAt: string;
  roomId: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  resourcePath: { id: string; name: string }[];
}

export interface SharedWithMeResponse {
  rooms: SharedWithMeRoom[];
}

export const sharesApi = {
  create: (dto: CreateShareRequest): Promise<CreateShareResponse> =>
    api.post<CreateShareResponse>("/shares", dto),

  list: (resourceType?: string, resourceId?: string): Promise<Share[]> => {
    const params = new URLSearchParams();
    if (resourceType) params.set("resourceType", resourceType);
    if (resourceId) params.set("resourceId", resourceId);
    const query = params.toString();
    return api.get<Share[]>(`/shares${query ? `?${query}` : ""}`);
  },

  listForRoom: (roomId: string): Promise<Share[]> =>
    api.get<Share[]>(`/shares/room/${roomId}`),

  listRoomShares: (): Promise<Share[]> =>
    api.get<Share[]>("/shares/rooms"),

  sharedWithMe: (): Promise<SharedWithMeResponse> =>
    api.get<SharedWithMeResponse>("/shares/with-me"),

  revoke: (shareId: string): Promise<void> =>
    api.delete<void>(`/shares/${shareId}`),
};

export const publicApi = {
  resolve: (token: string): Promise<PublicShareResolveResponse> =>
    api.get<PublicShareResolveResponse>(`/public/${token}`),

  getFolderContents: (
    token: string,
    folderId: string,
    limit?: number,
    cursor?: string,
  ): Promise<PublicFolderContentsResponse> => {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (cursor) params.set("cursor", cursor);
    const query = params.toString();
    return api.get<PublicFolderContentsResponse>(
      `/public/${token}/folders/${folderId}/contents${query ? `?${query}` : ""}`,
    );
  },

  getFile: (token: string): Promise<PublicFileViewResponse> =>
    api.get<PublicFileViewResponse>(`/public/${token}/file`),

  getFileView: (token: string, fileId: string): Promise<PublicFileViewResponse> =>
    api.get<PublicFileViewResponse>(`/public/${token}/files/${fileId}/view`),
};
