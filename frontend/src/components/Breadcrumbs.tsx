import { ChevronRight, FolderOpen } from "lucide-react";
import { Breadcrumb } from "../api/folders";

interface BreadcrumbsProps {
  items: Breadcrumb[];
  onNavigate?: (itemId: string) => void;
  onNavigateRoom?: (roomId: string) => void;
}

export function Breadcrumbs({
  items,
  onNavigate,
  onNavigateRoom,
}: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      className="flex items-center gap-1 text-sm text-zinc-400"
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isRoom = index === 0;

        if (isLast) {
          return (
            <span
              key={item.id}
              className="flex items-center gap-1 truncate font-medium text-zinc-100"
            >
              {isRoom ? <FolderOpen className="h-4 w-4 shrink-0" /> : null}
              {item.name}
            </span>
          );
        }

        const handleClick =
          isRoom && onNavigateRoom
            ? () => onNavigateRoom(item.id)
            : () => onNavigate?.(item.id);

        return (
          <span key={item.id} className="flex items-center gap-1 truncate">
            <button
              onClick={handleClick}
              className="hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              {isRoom ? <FolderOpen className="h-4 w-4 shrink-0" /> : null}
              {item.name}
            </button>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
          </span>
        );
      })}
    </nav>
  );
}
