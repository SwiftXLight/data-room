import { Link } from "react-router-dom";
import { FolderOpen, Share2, LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center bg-zinc-900/30">
      <Link to="/rooms" className="flex items-center gap-2 hover:text-indigo-400 transition-colors">
        <FolderOpen className="h-5 w-5" />
        <span className="font-bold tracking-tight">Data Room</span>
      </Link>
      <div className="flex items-center gap-4">
        <Link
          to="/shared-with-me"
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 flex items-center gap-2"
        >
          <Share2 className="h-3.5 w-3.5" />
          Shared with me
        </Link>
        <span className="text-sm text-zinc-400">{user?.email}</span>
        <button
          onClick={() => logout()}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 flex items-center gap-2"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </header>
  );
}
