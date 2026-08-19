import { useState } from "react";
import { Copy, Check, UserPlus, Link as LinkIcon, Trash2, Loader2 } from "lucide-react";
import { Share } from "../api/shares";

interface SharesListProps {
  shares: Share[];
  onRevoke: (shareId: string) => Promise<void>;
  canRevoke?: boolean;
}

export function SharesList({ shares, onRevoke, canRevoke }: SharesListProps) {
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleRevoke = async (shareId: string) => {
    setRevokingId(shareId);
    try {
      await onRevoke(shareId);
    } catch (err) {
      console.error("Failed to revoke share:", err);
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopy = async (url: string, shareId: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (shares.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 text-sm">
        No active shares
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {shares.map((share) => (
        <div
          key={share.id}
          className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`rounded-lg p-2 shrink-0 ${
              share.accessType === "PUBLIC"
                ? "bg-emerald-600/10"
                : "bg-indigo-600/10"
            }`}>
              {share.accessType === "PUBLIC" ? (
                <LinkIcon className="h-4 w-4 text-emerald-400" />
              ) : (
                <UserPlus className="h-4 w-4 text-indigo-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-zinc-200 truncate">
                  {share.accessType === "PUBLIC"
                    ? "Public link"
                    : share.recipient?.email || "Private share"}
                </span>
                <span className="text-xs text-zinc-600 shrink-0">
                  {share.resourceType.toLowerCase()}
                </span>
              </div>

              <p className="text-sm text-zinc-300 truncate mt-0.5">
                {share.resourceName || "Unknown resource"}
              </p>

              {share.accessType === "PUBLIC" && share.publicUrl ? (
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="text"
                    readOnly
                    value={share.publicUrl}
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-300 outline-none min-w-0"
                  />
                  <button
                    onClick={() => handleCopy(share.publicUrl!, share.id)}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700 flex items-center gap-1.5 shrink-0"
                  >
                    {copiedId === share.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 mt-0.5">
                  {share.accessType === "PRIVATE"
                    ? `Access granted to ${share.recipient?.email || "user"}`
                    : share.publicUrl
                      ? ""
                      : "Open Share dialog to copy link"}
                  {!share.publicUrl && share.accessType === "PUBLIC" && (
                    <> · Created {new Date(share.createdAt).toLocaleDateString()}</>
                  )}
                </p>
              )}
            </div>
          </div>

          {canRevoke && (
            <button
              onClick={() => handleRevoke(share.id)}
              disabled={revokingId === share.id || !!share.revokedAt}
              className="rounded-lg p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50 shrink-0 ml-3"
              title={share.revokedAt ? "Already revoked" : "Revoke access"}
            >
              {revokingId === share.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
