import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Share2, FolderOpen, FileText, Loader2, AlertTriangle, ChevronRight, X } from "lucide-react";
import { publicApi, PublicShareResolveResponse, PublicFolderContentsResponse } from "../api/shares";
import { ApiError } from "../api/client";

export function PublicSharePage() {
  const { token } = useParams<{ token: string }>();
  const [share, setShare] = useState<PublicShareResolveResponse | null>(null);
  const [contents, setContents] = useState<PublicFolderContentsResponse | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ id: string; name: string; url: string } | null>(null);

  const loadShare = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await publicApi.resolve(token);
      setShare(data);

      if (data.room?.rootFolderId) {
        setCurrentFolderId(data.room.rootFolderId);
      } else if (data.folder?.id) {
        setCurrentFolderId(data.folder.id);
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Invalid or expired share link.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const loadFolderContents = useCallback(async (folderId: string) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await publicApi.getFolderContents(token, folderId, 50);
      setContents(data);
      setCurrentFolderId(folderId);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Failed to load folder contents.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const handlePreviewFile = async (fileId: string, fileName: string) => {
    if (!token) return;
    try {
      const data = await publicApi.getFileView(token, fileId);
      setPreviewFile({ id: fileId, name: fileName, url: data.url });
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Failed to load file preview.");
    }
  };

  useEffect(() => {
    loadShare();
  }, [loadShare]);

  useEffect(() => {
    if (currentFolderId && share) {
      loadFolderContents(currentFolderId);
    }
  }, [currentFolderId, share, loadFolderContents]);

  const navigateToFolder = (folderId: string) => {
    loadFolderContents(folderId);
  };

  const buildBreadcrumbs = () => {
    if (!contents) return [];
    return contents.breadcrumbs;
  };

  if (isLoading && !share) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
        <header className="border-b border-zinc-800 px-6 py-4 bg-zinc-900/30">
          <span className="font-bold tracking-tight">Data Room Share</span>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </main>
      </div>
    );
  }

  if (error && !share) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
        <header className="border-b border-zinc-800 px-6 py-4 bg-zinc-900/30">
          <span className="font-bold tracking-tight">Data Room Share</span>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-4 bg-zinc-900/30">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 ring-1 ring-indigo-500/30">
            <Share2 className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <span className="font-bold tracking-tight">Data Room Share</span>
            <p className="text-xs text-zinc-500">Public Access</p>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {share?.file && (
          <div className="text-center py-16">
            <div className="rounded-full bg-zinc-800/60 p-3 mb-4 inline-block">
              <FileText className="h-8 w-8 text-emerald-400" />
            </div>
            <h1 className="text-xl font-semibold text-zinc-100 mb-2">{share.file.name}</h1>
            <p className="text-sm text-zinc-400 mb-6">
              {(Number(share.file.sizeBytes) / 1024 / 1024).toFixed(1)} MB
            </p>
            <button
              onClick={() => setPreviewFile({ id: share.file!.id, name: share.file!.name, url: "" })}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500"
            >
              View File
            </button>
          </div>
        )}

        {(share?.room || share?.folder) && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              {buildBreadcrumbs().map((crumb, index) => (
                <div key={crumb.id} className="flex items-center gap-2">
                  {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />}
                  <span className={index === buildBreadcrumbs().length - 1 ? "text-zinc-200 font-medium" : ""}>
                    {crumb.name}
                  </span>
                </div>
              ))}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            ) : contents && (contents.folders.length === 0 && contents.files.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-zinc-800/60 p-3 mb-3">
                  <FolderOpen className="h-6 w-6 text-zinc-500" />
                </div>
                <p className="text-sm text-zinc-400">This folder is empty</p>
              </div>
            ) : contents ? (
              <div className="overflow-hidden rounded-xl border border-zinc-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900/60 text-xs uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Size</th>
                      <th className="px-4 py-3 font-medium">Modified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {contents.folders.map((folder) => (
                      <tr
                        key={folder.id}
                        className="group cursor-pointer transition-colors hover:bg-zinc-800/40"
                        onClick={() => navigateToFolder(folder.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <FolderOpen className="h-5 w-5 text-indigo-400 shrink-0" />
                            <span className="font-medium text-zinc-100">
                              {folder.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-500">—</td>
                        <td className="px-4 py-3 text-zinc-500">
                          {new Date(folder.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {contents.files.map((file) => (
                      <tr
                        key={file.id}
                        className="group cursor-pointer transition-colors hover:bg-zinc-800/40"
                        onClick={() => handlePreviewFile(file.id, file.name)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-emerald-400 shrink-0" />
                            <span className="text-zinc-200">{file.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-500">
                          {(Number(file.sizeBytes) / 1024 / 1024).toFixed(1)} MB
                        </td>
                        <td className="px-4 py-3 text-zinc-500">
                          {new Date(file.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )}

        {previewFile && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8">
            <div className="w-full h-full max-w-5xl bg-zinc-900 rounded-xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <span className="text-sm font-medium text-zinc-200">{previewFile.name}</span>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="rounded-lg p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 bg-zinc-950">
                {previewFile.url ? (
                  <iframe
                    src={previewFile.url}
                    className="w-full h-full"
                    title={previewFile.name}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
