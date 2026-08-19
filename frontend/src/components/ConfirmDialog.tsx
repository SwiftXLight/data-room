import { createPortal } from "react-dom";
import { X, AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const confirmButtonClass = {
    danger: "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20",
    warning: "bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/20",
    default: "bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20",
  }[variant];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${variant === "danger" ? "bg-red-500/10" : variant === "warning" ? "bg-amber-500/10" : "bg-indigo-500/10"}`}>
              <AlertTriangle className={`h-5 w-5 ${variant === "danger" ? "text-red-400" : variant === "warning" ? "text-amber-400" : "text-indigo-400"}`} />
            </div>
            <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-zinc-400 mb-5">{description}</p>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60 ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
