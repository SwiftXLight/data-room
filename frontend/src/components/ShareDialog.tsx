import { useState, useEffect, useRef } from "react";
import { X, Copy, Check, Share2, UserPlus, Link as LinkIcon } from "lucide-react";
import { sharesApi, CreateShareRequest, CreateShareResponse } from "../api/shares";
import { useToast } from "../hooks/useToast";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: "DATA_ROOM" | "FOLDER" | "FILE";
  resourceId: string;
  resourceName: string;
  onShareCreated?: () => void;
}

export function ShareDialog({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  resourceName,
  onShareCreated,
}: ShareDialogProps) {
  const { addToast } = useToast();
  const [accessType, setAccessType] = useState<"PRIVATE" | "PUBLIC">("PUBLIC");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdShare, setCreatedShare] = useState<CreateShareResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAccessType("PUBLIC");
      setRecipientEmail("");
      setError(null);
      setCreatedShare(null);
      setIsSubmitting(false);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const dto: CreateShareRequest = {
        resourceType,
        resourceId,
        accessType,
        role: "VIEWER",
        ...(accessType === "PRIVATE" && { recipientEmail }),
      };

      const share = await sharesApi.create(dto);
      setCreatedShare(share);
      addToast(
        accessType === "PUBLIC" ? "Public link created" : "Shared successfully",
        "success",
      );
    } catch (err: any) {
      const apiErr = err as { code?: string; message?: string };
      if (apiErr.code === "SHARE_RECIPIENT_NOT_FOUND") {
        setError("No user found with that email address.");
      } else if (apiErr.code === "SHARE_ALREADY_EXISTS") {
        setError("This resource is already shared with this user or has an active public link.");
      } else {
        setError(apiErr.message || "Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (createdShare?.url) {
      await navigator.clipboard.writeText(createdShare.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    if (createdShare) {
      onShareCreated?.();
    }
    setCreatedShare(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-600/10 p-2">
              <Share2 className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Share</h2>
              <p className="text-xs text-zinc-500">{resourceName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pb-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {createdShare ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center py-4">
                <div className="rounded-full bg-emerald-600/10 p-3 mb-3">
                  <Check className="h-8 w-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-1">
                  {accessType === "PUBLIC" ? "Public link created" : "Shared successfully"}
                </h3>
                <p className="text-sm text-zinc-400">
                  {accessType === "PUBLIC"
                    ? "Anyone with this link can view the content."
                    : `Shared with ${createdShare.recipient?.email || "user"}`}
                </p>
              </div>

              {createdShare.url && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Share link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={createdShare.url}
                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-zinc-300 outline-none"
                    />
                    <button
                      onClick={handleCopy}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 flex items-center gap-1.5"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Copy this link and share it with anyone you want to give access to.
                  </p>
                </div>
              )}

              {!createdShare.url && createdShare.recipient && (
                <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-3">
                  <p className="text-sm text-zinc-300">
                    <span className="font-medium">{createdShare.recipient.email}</span> can now access this content.
                  </p>
                </div>
              )}

              <button
                onClick={handleClose}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Who can access
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAccessType("PUBLIC")}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        accessType === "PUBLIC"
                          ? "border-indigo-500 bg-indigo-600/10 text-indigo-400"
                          : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      <LinkIcon className="h-4 w-4" />
                      Public link
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccessType("PRIVATE")}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        accessType === "PRIVATE"
                          ? "border-indigo-500 bg-indigo-600/10 text-indigo-400"
                          : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      <UserPlus className="h-4 w-4" />
                      Private
                    </button>
                  </div>
                </div>

                {accessType === "PRIVATE" && (
                  <div>
                    <label
                      htmlFor="recipient-email"
                      className="block text-sm font-medium text-zinc-300 mb-1.5"
                    >
                      Recipient email
                    </label>
                    <input
                      id="recipient-email"
                      ref={emailRef}
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (accessType === "PRIVATE" && !recipientEmail.trim())}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Sharing…" : "Share"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
