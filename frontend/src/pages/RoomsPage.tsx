import { useState, useEffect, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, FolderOpen, Loader2, Share2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { roomsApi, Room } from "../api/rooms";
import { ApiError } from "../api/client";
import { AppHeader } from "../components/AppHeader";
import { ShareDialog } from "../components/ShareDialog";

export function RoomsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [sharingRoomId, setSharingRoomId] = useState<string | null>(null);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await roomsApi.list();
      setRooms(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Failed to load rooms.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const trimmed = createName.trim();
    if (!trimmed) return;

    setIsCreating(true);
    try {
      const room = await roomsApi.create(trimmed);
      setRooms((prev) => [...prev, room]);
      setCreateName("");
      navigate(`/rooms/${room.id}`);
    } catch (err) {
      const apiErr = err as ApiError;
      setCreateError(apiErr.message || "Failed to create room.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleShareCreated = () => {
    setSharingRoomId(null);
  };

  const sharingRoom = rooms.find((r) => r.id === sharingRoomId) || null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <AppHeader />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
            Your Data Rooms
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Select a room to browse folders and files.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="mb-8">
          {createError && (
            <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {createError}
            </div>
          )}
          <div className="flex gap-3">
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="New data room name"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 flex items-center gap-2"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Room
            </button>
          </div>
        </form>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-zinc-800/60 p-3 mb-3">
              <FolderOpen className="h-6 w-6 text-zinc-500" />
            </div>
            <p className="text-sm text-zinc-400">No data rooms yet</p>
            <p className="text-xs text-zinc-600 mt-1">
              Create your first data room above to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {rooms.map((room) => {
              const isOwner = user?.id === room.ownerId;
              return (
                <div
                  key={room.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition-all hover:border-indigo-500/30 hover:bg-zinc-800/40"
                >
                  <Link
                    to={`/rooms/${room.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="rounded-lg bg-indigo-600/10 p-2">
                      <FolderOpen className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-100 truncate">{room.name}</p>
                      <p className="text-xs text-zinc-500">
                        Created {new Date(room.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                  {isOwner && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setSharingRoomId(room.id);
                      }}
                      className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 flex items-center gap-1.5 ml-3"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <ShareDialog
        isOpen={!!sharingRoomId}
        onClose={() => setSharingRoomId(null)}
        resourceType="DATA_ROOM"
        resourceId={sharingRoomId || ""}
        resourceName={sharingRoom?.name || ""}
        onShareCreated={handleShareCreated}
      />
    </div>
  );
}
