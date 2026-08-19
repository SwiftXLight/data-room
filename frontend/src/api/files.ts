import api from "./client";

export interface FileItem {
  id: string;
  name: string;
  sizeBytes: string;
  mimeType: string;
  status: string;
  folderId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadUrlRequest {
  folderId: string;
  name: string;
  mimeType: string;
  sizeBytes: string;
}

export interface UploadUrlResponse {
  file: FileItem & { storageKey: string };
  upload: {
    url: string;
    method: string;
    expiresAt: string;
  };
}

export interface ViewUrlResponse {
  url: string;
  expiresAt: string;
}

export interface RenameFileResponse extends FileItem {}

export const filesApi = {
  requestUploadUrl: (dto: UploadUrlRequest): Promise<UploadUrlResponse> =>
    api.post<UploadUrlResponse>("/files/upload-url", dto),

  completeUpload: (fileId: string): Promise<FileItem> =>
    api.post<FileItem>(`/files/${fileId}/complete`, {}),

  getViewUrl: (fileId: string): Promise<ViewUrlResponse> =>
    api.get<ViewUrlResponse>(`/files/${fileId}/view`),

  rename: (fileId: string, name: string): Promise<FileItem> =>
    api.patch<FileItem>(`/files/${fileId}`, { name }),

  move: (fileId: string, destinationFolderId: string): Promise<FileItem> =>
    api.post<FileItem>(`/files/${fileId}/move`, { destinationFolderId }),

  delete: (fileId: string): Promise<void> =>
    api.delete<void>(`/files/${fileId}`),
};
