import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Pencil, Trash2, Share2 } from "lucide-react";

interface FolderActionsMenuProps {
  onRename: () => void;
  onDelete: () => void;
  onShare?: () => void;
  canShare?: boolean;
}

export function FolderActionsMenu({
  onRename,
  onDelete,
  onShare,
  canShare,
}: FolderActionsMenuProps) {
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

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onRename();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onDelete();
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onShare?.();
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
            {onShare && canShare && (
              <button
                onClick={handleShare}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            )}
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
