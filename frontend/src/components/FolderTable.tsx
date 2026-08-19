import { Folder } from "../api/folders";
import { FileItem } from "../api/files";
import { Folder as FolderIcon, FileText, FolderOpen } from "lucide-react";
import { FolderActionsMenu } from "./FolderActionsMenu";
import { FileActionsMenu } from "./FileActionsMenu";

interface FolderTableProps {
  folders: Folder[];
  files: FileItem[];
  onFolderClick: (folderId: string) => void;
  onRenameFolder?: (folder: Folder) => void;
  onDeleteFolder?: (folder: Folder) => void;
  onRenameFile?: (file: FileItem) => Promise<void> | void;
  onDeleteFile?: (file: FileItem) => Promise<void> | void;
  onPreviewFile?: (file: FileItem) => void;
  onMoveFile?: (file: FileItem) => void;
}

function formatBytes(bytes: string): string {
  if (!bytes || bytes === "0") return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const num = Number(bytes);
  const i = Math.floor(Math.log(num) / Math.log(k));
  return `${parseFloat((num / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function FolderTable({
  folders,
  files,
  onFolderClick,
  onRenameFolder,
  onDeleteFolder,
  onRenameFile,
  onDeleteFile,
  onPreviewFile,
  onMoveFile,
}: FolderTableProps) {
  if (folders.length === 0 && files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-zinc-800/60 p-3 mb-3">
          <FolderOpen className="h-6 w-6 text-zinc-500" />
        </div>
        <p className="text-sm text-zinc-400">This folder is empty</p>
        <p className="text-xs text-zinc-600 mt-1">
          Create a folder or upload files to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-900/60 text-xs uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Size</th>
            <th className="px-4 py-3 font-medium">Modified</th>
            {(onRenameFolder ||
              onDeleteFolder ||
              onRenameFile ||
              onDeleteFile ||
              onPreviewFile ||
              onMoveFile) && <th className="w-10 px-4 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {folders.map((folder) => (
            <tr
              key={folder.id}
              className="group cursor-pointer transition-colors hover:bg-zinc-800/40"
              onClick={() => onFolderClick(folder.id)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <FolderIcon className="h-5 w-5 text-indigo-400 shrink-0" />
                  <span className="font-medium text-zinc-100">
                    {folder.name}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-500">—</td>
              <td className="px-4 py-3 text-zinc-500">
                {new Date(folder.updatedAt).toLocaleDateString()}
              </td>
              {(onRenameFolder || onDeleteFolder) && (
                <td className="px-4 py-3">
                  {(onRenameFolder || onDeleteFolder) && (
                    <FolderActionsMenu
                      onRename={() => onRenameFolder?.(folder)}
                      onDelete={() => onDeleteFolder?.(folder)}
                    />
                  )}
                </td>
              )}
            </tr>
          ))}
          {files.map((file) => (
            <tr
              key={file.id}
              className="group transition-colors hover:bg-zinc-800/40"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span className="text-zinc-200">{file.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-500">
                {formatBytes(file.sizeBytes)}
              </td>
              <td className="px-4 py-3 text-zinc-500">
                {new Date(file.updatedAt).toLocaleDateString()}
              </td>
              {(onRenameFile ||
                onDeleteFile ||
                onPreviewFile ||
                onMoveFile) && (
                <td className="px-4 py-3">
                  {(onRenameFile ||
                    onDeleteFile ||
                    onPreviewFile ||
                    onMoveFile) && (
                    <FileActionsMenu
                      file={file}
                      onPreview={() => onPreviewFile?.(file)}
                      onRename={() => onRenameFile?.(file)}
                      onDelete={() => onDeleteFile?.(file)}
                      onMove={() => onMoveFile?.(file)}
                    />
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
