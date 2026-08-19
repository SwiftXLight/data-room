import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, FolderOpen, Loader2 } from "lucide-react";
import { FileItem } from "../api/files";
import { foldersApi } from "../api/folders";
import { ApiError } from "../api/client";

interface MoveFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (destinationFolderId: string) => Promise<void>;
  file: FileItem | null;
  currentFolderId: string;
}

interface FolderOption {
  id: string;
  name: string;
}

export function MoveFileDialog({
  isOpen,
  onClose,
  onConfirm,
  file,
  currentFolderId,
}: MoveFileDialogProps) {
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSubmitting(false);
      setSelectedFolderId("");
      loadFolders();
    }
  }, [isOpen]);

  const loadFolders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await foldersApi.getContents(currentFolderId, 100);
      const folderOptions: FolderOption[] = data.folders.map((f) => ({
        id: f.id,
        name: f.name,
        parentId: f.parentId,
      }));
      setFolders(folderOptions);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Failed to load folders.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedFolderId) {
      setError("Please select a destination folder.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(selectedFolderId);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === "FILE_NAME_CONFLICT") {
        setError(
          "A file with this name already exists in the destination folder.",
        );
      } else {
        setError(apiErr.message || "Failed to move file. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !file) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Move File</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-zinc-400 mb-4">
          Move <span className="font-medium text-zinc-200">"{file.name}"</span>{" "}
          to:
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-1.5 mb-5">
            <label className="block text-sm font-medium text-zinc-300">
              Destination folder
            </label>

            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
              </div>
            ) : folders.length === 0 ? (
              <p className="text-sm text-zinc-500 py-2">
                No folders available in this directory.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-700 divide-y divide-zinc-800">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      selectedFolderId === folder.id
                        ? "bg-indigo-600/20 text-indigo-300"
                        : "text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    <FolderOpen className="h-4 w-4 shrink-0" />
                    {folder.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading || folders.length === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Moving…" : "Move"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
