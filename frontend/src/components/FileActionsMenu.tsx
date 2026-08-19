import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  FolderOpen,
} from "lucide-react";
import { FileItem } from "../api/files";

interface FileActionsMenuProps {
  file: FileItem;
  onRename: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onMove: () => void;
}

export function FileActionsMenu({
  onRename,
  onDelete,
  onPreview,
  onMove,
}: FileActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleRename = () => {
    setIsOpen(false);
    onRename();
  };

  const handleDelete = () => {
    setIsOpen(false);
    onDelete();
  };

  const handlePreview = () => {
    setIsOpen(false);
    onPreview();
  };

  const handleMove = () => {
    setIsOpen(false);
    onMove();
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-zinc-800 hover:text-zinc-300 cursor-pointer"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 w-40 rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-2xl"
            style={{
              top: buttonRef.current?.getBoundingClientRect().bottom ?? 0,
              left: buttonRef.current?.getBoundingClientRect().right ?? 0,
            }}
          >
            <button
              onClick={handlePreview}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Preview
            </button>
            <button
              onClick={handleMove}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <FolderOpen className="h-4 w-4" />
              Move
            </button>
            <button
              onClick={handleRename}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Rename
            </button>
            <button
              onClick={handleDelete}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
