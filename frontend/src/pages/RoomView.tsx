import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus,
  Share2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { FolderTable } from "../components/FolderTable";
import { CreateFolderDialog } from "../components/CreateFolderDialog";
import { RenameFolderDialog } from "../components/RenameFolderDialog";
import { DeleteFolderDialog } from "../components/DeleteFolderDialog";
import { FileUploadZone } from "../components/FileUploadZone";
import { RenameFileDialog } from "../components/RenameFileDialog";
import { DeleteFileDialog } from "../components/DeleteFileDialog";
import { MoveFileDialog } from "../components/MoveFileDialog";
import { roomsApi, RoomDetail } from "../api/rooms";
import {
  foldersApi,
  Folder,
  FolderContentsResponse,
  CreateFolderResponse,
} from "../api/folders";
import { filesApi, FileItem, RenameFileResponse } from "../api/files";
import { ApiError } from "../api/client";
import { FilePreviewDialog } from "../components/FilePreviewDialog";
import { ShareDialog } from "../components/ShareDialog";
import { SharesList } from "../components/SharesList";
import { AppHeader } from "../components/AppHeader";
import { sharesApi, Share } from "../api/shares";
import { useAuth } from "../hooks/useAuth";

export function RoomView() {
  const { roomId, folderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [contents, setContents] = useState<FolderContentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<Folder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);

  const [renamingFile, setRenamingFile] = useState<FileItem | null>(null);
  const [deletingFile, setDeletingFile] = useState<FileItem | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [movingFile, setMovingFile] = useState<FileItem | null>(null);

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shares, setShares] = useState<Share[]>([]);
  const [showShares, setShowShares] = useState(false);

  const [sharingFolder, setSharingFolder] = useState<Folder | null>(null);
  const [sharingFile, setSharingFile] = useState<FileItem | null>(null);

  const currentFolderId = folderId || room?.rootFolderId || "";
  const isOwner = user?.id === room?.ownerId;

  const loadRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      const data = await roomsApi.get(roomId);
      setRoom(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Failed to load room.");
    }
  }, [roomId]);

  const loadContents = useCallback(async () => {
    if (!currentFolderId) return;
    try {
      const data = await foldersApi.getContents(currentFolderId, 50);
      setContents(data);
      setError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Failed to load folder contents.");
    } finally {
      setIsLoading(false);
    }
  }, [currentFolderId]);

  const loadShares = useCallback(async () => {
    if (!roomId) return;
    try {
      const data = await sharesApi.listForRoom(roomId);
      setShares(data);
    } catch (err) {
      console.error("Failed to load shares:", err);
    }
  }, [roomId]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  useEffect(() => {
    if (room || !roomId) {
      loadContents();
    }
  }, [room, roomId, loadContents]);

  useEffect(() => {
    if (room && roomId) {
      loadShares();
    }
  }, [room, roomId, loadShares]);

  const handleCreateFolder = async (
    name: string,
  ): Promise<CreateFolderResponse> => {
    if (!currentFolderId) throw new Error("No folder selected");
    const created = await foldersApi.create(currentFolderId, name);
    loadContents();
    return created;
  };

  const handleRenameFolder = async (name: string): Promise<Folder> => {
    if (!renamingFolder) throw new Error("No folder selected");
    const updated = await foldersApi.rename(renamingFolder.id, name);
    setContents((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        folders: prev.folders.map((f) =>
          f.id === updated.id ? { ...f, name: updated.name } : f,
        ),
      };
    });
    return updated;
  };

  const handleDeleteFolder = async (): Promise<void> => {
    if (!deletingFolder) return;
    const deletedFolderId = deletingFolder.id;
    const parentId = deletingFolder.parentId;

    await foldersApi.delete(deletedFolderId);

    if (deletedFolderId === currentFolderId) {
      if (roomId && parentId) {
        navigate(`/rooms/${roomId}/folders/${parentId}`);
      } else if (roomId) {
        navigate(`/rooms/${roomId}`);
      }
    } else {
      loadContents();
    }
  };

  const handleRenameFile = async (
    name: string,
  ): Promise<RenameFileResponse> => {
    if (!renamingFile) throw new Error("No file selected");
    const updated = await filesApi.rename(renamingFile.id, name);
    setContents((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        files: prev.files.map((f) =>
          f.id === updated.id ? { ...f, name: updated.name } : f,
        ),
      };
    });
    return updated;
  };

  const handleDeleteFile = async (): Promise<void> => {
    if (!deletingFile) return;
    await filesApi.delete(deletingFile.id);
    setContents((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        files: prev.files.filter((f) => f.id !== deletingFile.id),
      };
    });
  };

  const handleMoveFile = async (destinationFolderId: string): Promise<void> => {
    if (!movingFile) return;
    await filesApi.move(movingFile.id, destinationFolderId);
    loadContents();
  };

  const handlePreviewFile = async (file: FileItem) => {
    try {
      await filesApi.getViewUrl(file.id);
      setPreviewFile({ ...file });
    } catch (err) {
      const apiErr = err as ApiError;
      alert(apiErr.message || "Failed to load file preview.");
    }
  };

  const handleUploadComplete = () => {
    loadContents();
  };

  const handleShareCreated = () => {
    loadShares();
  };

  const handleRevokeShare = async (shareId: string): Promise<void> => {
    await sharesApi.revoke(shareId);
    setShares((prev) => prev.filter((s) => s.id !== shareId));
  };

  const handleShareFolder = (folder: Folder) => {
    setSharingFolder(folder);
    setSharingFile(null);
    setIsShareDialogOpen(true);
  };

  const handleShareFile = (file: FileItem) => {
    setSharingFile(file);
    setSharingFolder(null);
    setIsShareDialogOpen(true);
  };

  const navigateToFolder = (folderId: string) => {
    if (roomId) {
      navigate(`/rooms/${roomId}/folders/${folderId}`);
    }
  };

  const navigateToRoom = () => {
    if (roomId) {
      navigate(`/rooms/${roomId}`);
    }
  };

  if (isLoading && !contents) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
        <header className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center bg-zinc-900/30">
          <span className="font-bold tracking-tight">Data Room</span>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </main>
      </div>
    );
  }

  const isRoot = currentFolderId === room?.rootFolderId;
  const dialogResourceType = sharingFolder
    ? "FOLDER"
    : sharingFile
      ? "FILE"
      : isRoot
        ? "DATA_ROOM"
        : "FOLDER";
  const dialogResourceId = sharingFolder
    ? sharingFolder.id
    : sharingFile
      ? sharingFile.id
      : isRoot
        ? roomId!
        : currentFolderId;
  const dialogResourceName = sharingFolder
    ? sharingFolder.name
    : sharingFile
      ? sharingFile.name
      : room?.name || contents?.folder.name || "";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
      <AppHeader />

      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {contents && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <Breadcrumbs
                items={contents.breadcrumbs}
                onNavigate={navigateToFolder}
                onNavigateRoom={navigateToRoom}
              />
              <button
                onClick={() => setIsCreateFolderOpen(true)}
                className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Folder
              </button>
            </div>

            <FileUploadZone
              folderId={currentFolderId}
              onUploadComplete={handleUploadComplete}
            />

            <FolderTable
              folders={contents.folders}
              files={contents.files}
              onFolderClick={navigateToFolder}
              onRenameFolder={(folder) => setRenamingFolder(folder)}
              onDeleteFolder={(folder) => setDeletingFolder(folder)}
              onShareFolder={handleShareFolder}
              canShareFolder={isOwner}
              onRenameFile={(file) => setRenamingFile(file)}
              onDeleteFile={(file) => setDeletingFile(file)}
              onPreviewFile={handlePreviewFile}
              onMoveFile={(file) => setMovingFile(file)}
              onShareFile={handleShareFile}
              canShareFile={isOwner}
            />

            {isOwner && (
              <div className="border-t border-zinc-800 pt-6">
                <button
                  onClick={() => setShowShares(!showShares)}
                  className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  {showShares ? "Hide" : "Show"} shares ({shares.length})
                </button>
                {showShares && (
                  <div className="mt-4">
                    <SharesList shares={shares} onRevoke={handleRevokeShare} canRevoke={isOwner} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <CreateFolderDialog
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onSubmit={handleCreateFolder}
      />

      <RenameFolderDialog
        isOpen={!!renamingFolder}
        onClose={() => setRenamingFolder(null)}
        onSubmit={handleRenameFolder}
        initialName={renamingFolder?.name || ""}
      />

      <DeleteFolderDialog
        isOpen={!!deletingFolder}
        onClose={() => setDeletingFolder(null)}
        onConfirm={handleDeleteFolder}
        folder={deletingFolder}
      />

      <RenameFileDialog
        isOpen={!!renamingFile}
        onClose={() => setRenamingFile(null)}
        onSubmit={handleRenameFile}
        initialName={renamingFile?.name || ""}
      />

      <DeleteFileDialog
        isOpen={!!deletingFile}
        onClose={() => setDeletingFile(null)}
        onConfirm={handleDeleteFile}
        file={deletingFile}
      />

      <MoveFileDialog
        isOpen={!!movingFile}
        onClose={() => setMovingFile(null)}
        onConfirm={handleMoveFile}
        file={movingFile}
        currentFolderId={currentFolderId}
      />

      {previewFile && (
        <FilePreviewDialog
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {isOwner && (
        <ShareDialog
          isOpen={isShareDialogOpen}
          onClose={() => {
            setIsShareDialogOpen(false);
            setSharingFolder(null);
            setSharingFile(null);
          }}
          resourceType={dialogResourceType}
          resourceId={dialogResourceId}
          resourceName={dialogResourceName}
          onShareCreated={handleShareCreated}
        />
      )}
    </div>
  );
}
