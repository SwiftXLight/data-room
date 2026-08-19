import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Plus,
  FolderOpen,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { FolderTable } from "../components/FolderTable";
import { CreateFolderDialog } from "../components/CreateFolderDialog";
import { RenameFolderDialog } from "../components/RenameFolderDialog";
import { DeleteFolderDialog } from "../components/DeleteFolderDialog";
import { roomsApi, RoomDetail } from "../api/rooms";
import {
  foldersApi,
  Folder,
  FolderContentsResponse,
  CreateFolderResponse,
} from "../api/folders";
import { ApiError } from "../api/client";

export function RoomView() {
  const { roomId, folderId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [contents, setContents] = useState<FolderContentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<Folder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);

  const currentFolderId = folderId || room?.rootFolderId || "";

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

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  useEffect(() => {
    if (room || !roomId) {
      loadContents();
    }
  }, [room, roomId, loadContents]);

  const handleCreateFolder = async (name: string): Promise<CreateFolderResponse> => {
    if (!currentFolderId) throw new Error("No folder selected");
    const created = await foldersApi.create(currentFolderId, name);
    loadContents();
    return created;
  };

  const handleRenameFolder = async (name: string): Promise<Folder> => {
    if (!renamingFolder) throw new Error("No folder selected");
    const updated = await foldersApi.rename(renamingFolder.id, name);
    loadContents();
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center bg-zinc-900/30">
        <div className="flex items-center gap-4">
          <Link
            to="/rooms"
            className="flex items-center gap-2 hover:text-indigo-400 transition-colors"
          >
            <FolderOpen className="h-5 w-5" />
            <span className="font-bold tracking-tight">Data Room</span>
          </Link>
          {room && (
            <>
              <ChevronRight className="h-4 w-4 text-zinc-600" />
              <span className="text-sm text-zinc-300">{room.name}</span>
            </>
          )}
        </div>
      </header>

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

            <FolderTable
              folders={contents.folders}
              files={contents.files}
              onFolderClick={navigateToFolder}
              onRenameFolder={(folder) => setRenamingFolder(folder)}
              onDeleteFolder={(folder) => setDeletingFolder(folder)}
            />
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
    </div>
  );
}
