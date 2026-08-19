import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FolderOpen, FileText, Loader2, AlertTriangle, ChevronRight, User } from "lucide-react";
import { sharesApi, SharedWithMeResponse } from "../api/shares";
import { AppHeader } from "../components/AppHeader";

export function SharedWithMePage() {
  const [data, setData] = useState<SharedWithMeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadShared();
  }, []);

  const loadShared = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await sharesApi.sharedWithMe();
      setData(result);
    } catch (err) {
      setError("Failed to load shared resources.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!data || data.rooms.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FolderOpen className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-sm text-zinc-400">Nothing shared with you yet</p>
            <p className="text-xs text-zinc-600 mt-1">
              When someone shares a room, folder, or file with you, it will appear here.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
      <AppHeader />

      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
            Shared with me
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Rooms, folders, and files others have shared with you.
          </p>
        </div>

        <div className="space-y-8">
          {data.rooms.map((room) => (
            <div key={room.id} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-600/10 p-2">
                  <FolderOpen className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <Link
                    to={`/rooms/${room.id}`}
                    className="font-medium text-zinc-100 hover:text-indigo-400 transition-colors"
                  >
                    {room.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    <User className="h-3 w-3 text-zinc-600" />
                    <span className="text-xs text-zinc-500">
                      Shared by {room.ownerEmail}
                    </span>
                  </div>
                </div>
              </div>

              <div className="ml-8 space-y-1">
                {room.shares.map((share) => (
                  <div
                    key={share.shareId}
                    className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {share.resourceType === "FILE" ? (
                        <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <FolderOpen className="h-4 w-4 text-indigo-400 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-200 truncate">
                            {share.resourceName}
                          </span>
                          <span className="text-xs text-zinc-600 shrink-0">
                            {share.resourceType.toLowerCase()}
                          </span>
                        </div>
                        {share.resourcePath.length > 1 && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-zinc-500">
                            {share.resourcePath.map((crumb, index) => (
                              <div key={crumb.id} className="flex items-center gap-1">
                                {index > 0 && <ChevronRight className="h-3 w-3 text-zinc-600" />}
                                <span>{crumb.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {share.resourceType === "FILE" ? (
                      <Link
                        to={`/rooms/${room.id}/folders/${room.rootFolderId}`}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors shrink-0"
                      >
                        Open room
                      </Link>
                    ) : (
                      <Link
                        to={`/rooms/${room.id}/folders/${share.resourceId}`}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors shrink-0"
                      >
                        Open
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
