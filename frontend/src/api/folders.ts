import api from "../api/client";

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FileItem {
  id: string;
  name: string;
  sizeBytes: bigint;
  mimeType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Breadcrumb {
  id: string;
  name: string;
}

export interface FolderContentsResponse {
  folder: {
    id: string;
    name: string;
    parentId: string | null;
    dataRoomId: string;
  };
  breadcrumbs: Breadcrumb[];
  folders: Folder[];
  files: FileItem[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export interface CreateFolderResponse extends Folder {
  dataRoomId: string;
}

export const foldersApi = {
  getContents: (
    folderId: string,
    limit?: number,
    cursor?: string,
  ): Promise<FolderContentsResponse> => {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (cursor) params.set("cursor", cursor);
    const query = params.toString();
    return api.get<FolderContentsResponse>(
      `/folders/${folderId}/contents${query ? `?${query}` : ""}`,
    );
  },

  create: (parentId: string, name: string): Promise<CreateFolderResponse> =>
    api.post<CreateFolderResponse>("/folders", { parentId, name }),

  rename: (folderId: string, name: string): Promise<Folder> =>
    api.patch<Folder>(`/folders/${folderId}`, { name }),

  delete: (folderId: string): Promise<void> =>
    api.delete<void>(`/folders/${folderId}`),
};
