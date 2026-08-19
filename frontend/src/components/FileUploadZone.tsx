import { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, AlertCircle, Check, Loader2 } from "lucide-react";
import { filesApi, UploadUrlRequest } from "../api/files";
import { ApiError } from "../api/client";

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "processing" | "ready" | "error";
  error?: string;
  fileId?: string;
  uploadUrl?: string;
}

interface ConflictedFile {
  tempId: string;
  originalName: string;
  file: File;
  newName: string;
}

interface FileUploadZoneProps {
  folderId: string;
  onUploadComplete?: () => void;
}

export function FileUploadZone({
  folderId,
  onUploadComplete,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<UploadingFile[]>([]);
  const [conflictedFiles, setConflictedFiles] = useState<ConflictedFile[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setGlobalError(null);

      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setGlobalError(`"${file.name}" is not a PDF file.`);
        return;
      }

      if (file.type !== "application/pdf") {
        setGlobalError(`"${file.name}" is not a PDF file.`);
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        setGlobalError(`"${file.name}" exceeds the 50 MB limit.`);
        return;
      }

      const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const uploadingFile: UploadingFile = {
        id: tempId,
        file,
        progress: 0,
        status: "uploading",
      };

      setQueue((prev) => [...prev, uploadingFile]);

      try {
        const dto: UploadUrlRequest = {
          folderId,
          name: file.name,
          mimeType: file.type || "application/pdf",
          sizeBytes: String(file.size),
        };

        const response = await filesApi.requestUploadUrl(dto);

        setQueue((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? {
                  ...f,
                  fileId: response.file.id,
                  uploadUrl: response.upload.url,
                  progress: 0,
                }
              : f,
          ),
        );

        await uploadToPresignedUrl(response.upload.url, file, tempId);

        setQueue((prev) =>
          prev.map((f) =>
            f.id === tempId ? { ...f, progress: 100, status: "processing" } : f,
          ),
        );

        await filesApi.completeUpload(response.file.id);

        setQueue((prev) =>
          prev.map((f) => (f.id === tempId ? { ...f, status: "ready" } : f)),
        );

        onUploadComplete?.();
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr.code === "FILE_NAME_CONFLICT") {
          setQueue((prev) =>
            prev.map((f) =>
              f.id === tempId
                ? {
                    ...f,
                    status: "error" as const,
                    error: "A file with this name already exists.",
                  }
                : f,
            ),
          );

          const baseName = file.name.replace(/\.pdf$/i, "");
          const conflicted: ConflictedFile = {
            tempId,
            originalName: file.name,
            file,
            newName: `${baseName} (1).pdf`,
          };
          setConflictedFiles((prev) => [...prev, conflicted]);
        } else {
          setQueue((prev) =>
            prev.map((f) =>
              f.id === tempId
                ? {
                    ...f,
                    status: "error" as const,
                    error: apiErr.message || "Upload failed.",
                  }
                : f,
            ),
          );
        }
      }
    },
    [folderId, onUploadComplete],
  );

  const uploadToPresignedUrl = (
    url: string,
    file: File,
    tempId: string,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", file.type || "application/pdf");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          setQueue((prev) =>
            prev.map((f) =>
              f.id === tempId ? { ...f, progress: percentage } : f,
            ),
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload."));
      xhr.send(file);
    });
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      files.forEach(processFile);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(processFile);
    e.target.value = "";
  };

  const removeFromQueue = (tempId: string) => {
    setQueue((prev) => prev.filter((f) => f.id !== tempId));
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((f) => f.status !== "ready"));
  };

  const retryWithNewName = async (conflicted: ConflictedFile) => {
    setConflictedFiles((prev) =>
      prev.filter((c) => c.tempId !== conflicted.tempId),
    );
    setQueue((prev) =>
      prev.map((f) =>
        f.id === conflicted.tempId
          ? {
              ...f,
              status: "uploading" as const,
              progress: 0,
              error: undefined,
            }
          : f,
      ),
    );

    try {
      const dto: UploadUrlRequest = {
        folderId,
        name: conflicted.newName,
        mimeType: conflicted.file.type || "application/pdf",
        sizeBytes: String(conflicted.file.size),
      };

      const response = await filesApi.requestUploadUrl(dto);

      setQueue((prev) =>
        prev.map((f) =>
          f.id === conflicted.tempId
            ? {
                ...f,
                fileId: response.file.id,
                uploadUrl: response.upload.url,
                progress: 0,
              }
            : f,
        ),
      );

      await uploadToPresignedUrl(
        response.upload.url,
        conflicted.file,
        conflicted.tempId,
      );

      setQueue((prev) =>
        prev.map((f) =>
          f.id === conflicted.tempId
            ? { ...f, progress: 100, status: "processing" }
            : f,
        ),
      );

      await filesApi.completeUpload(response.file.id);

      setQueue((prev) =>
        prev.map((f) =>
          f.id === conflicted.tempId ? { ...f, status: "ready" } : f,
        ),
      );

      onUploadComplete?.();
    } catch (err) {
      const apiErr = err as ApiError;
      setQueue((prev) =>
        prev.map((f) =>
          f.id === conflicted.tempId
            ? {
                ...f,
                status: "error" as const,
                error: apiErr.message || "Upload failed.",
              }
            : f,
        ),
      );
    }
  };

  const updateConflictedName = (tempId: string, newName: string) => {
    setConflictedFiles((prev) =>
      prev.map((c) => (c.tempId === tempId ? { ...c, newName } : c)),
    );
  };

  const activeUploads = queue.filter(
    (f) => f.status === "uploading" || f.status === "processing",
  );
  const completedUploads = queue.filter((f) => f.status === "ready");
  const erroredUploads = queue.filter((f) => f.status === "error");

  return (
    <div className="space-y-3">
      {globalError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {globalError}
        </div>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          isDragging
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/20"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />
        <Upload className="mx-auto h-8 w-8 text-zinc-500 mb-3" />
        <p className="text-sm font-medium text-zinc-300">
          Drop PDF files here or click to browse
        </p>
        <p className="text-xs text-zinc-500 mt-1">Maximum file size: 50 MB</p>
      </div>

      {queue.length > 0 && (
        <div className="space-y-2">
          {activeUploads.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-400">
                Uploading {activeUploads.length} file
                {activeUploads.length > 1 ? "s" : ""}...
              </p>
            </div>
          )}

          {queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"
            >
              <FileText className="h-5 w-5 text-indigo-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">
                  {item.file.name}
                </p>
                {item.status === "uploading" && (
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-800">
                    <div
                      className="h-1.5 rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
                {item.status === "processing" && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
                    <p className="text-xs text-zinc-500">Processing...</p>
                  </div>
                )}
                {item.status === "ready" && (
                  <p className="text-xs text-emerald-400 mt-1">
                    Upload complete
                  </p>
                )}
                {item.status === "error" && (
                  <p className="text-xs text-red-400 mt-1">{item.error}</p>
                )}
              </div>
              <button
                onClick={() => removeFromQueue(item.id)}
                className="rounded p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          {conflictedFiles.length > 0 && (
            <div className="space-y-2">
              {conflictedFiles.map((conflicted) => (
                <div
                  key={conflicted.tempId}
                  className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"
                >
                  <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {conflicted.originalName}
                    </p>
                    <p className="text-xs text-amber-400 mt-0.5">
                      Already exists. Choose a new name:
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={conflicted.newName}
                        onChange={(e) =>
                          updateConflictedName(
                            conflicted.tempId,
                            e.target.value,
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            retryWithNewName(conflicted);
                          }
                        }}
                        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <button
                        onClick={() => retryWithNewName(conflicted)}
                        className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(completedUploads.length > 0 || erroredUploads.length > 0) && (
            <div className="flex justify-end">
              <button
                onClick={clearCompleted}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Clear completed
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
