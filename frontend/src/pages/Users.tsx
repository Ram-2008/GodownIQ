import { useCallback, useEffect, useState } from "react";
import { usersApi, UserProfile } from "../api/users";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { TableSkeleton } from "../components/ui/Skeleton";
import { formatDDMMYYYY } from "../utils/date";

const STATUS_STYLES: Record<UserProfile["approval_status"], string> = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
  revoked: "bg-gray-200 text-gray-600",
};

export function UsersPage() {
  const { profile } = useAuth();
  const { show } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [inviting, setInviting] = useState(false);

  const [nameEdits, setNameEdits] = useState<Record<string, string>>({});
  const [whatsappEdits, setWhatsappEdits] = useState<Record<string, string>>({});
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    usersApi
      .list()
      .then(setUsers)
      .catch(() => show("Could not load staff.", "error"))
      .finally(() => setLoading(false));
  }, [show]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    try {
      await usersApi.invite(email.trim(), fullName.trim(), whatsappNumber.trim() || undefined);
      show("Invite sent.", "success");
      setEmail("");
      setFullName("");
      setWhatsappNumber("");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not send the invite.", "error");
    } finally {
      setInviting(false);
    }
  }

  async function handleApprove(userId: string) {
    setActingOn(userId);
    try {
      await usersApi.approve(userId);
      show("User approved.", "success");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not approve this user.", "error");
    } finally {
      setActingOn(null);
    }
  }

  async function handleReject(userId: string) {
    if (!confirm("Reject this account request? They will not be able to sign in.")) return;
    setActingOn(userId);
    try {
      await usersApi.reject(userId);
      show("User rejected.", "success");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not reject this user.", "error");
    } finally {
      setActingOn(null);
    }
  }

  async function handleRevoke(userId: string) {
    if (!confirm("Revoke this user's access? They will be signed out of the app until you approve them again.")) return;
    setActingOn(userId);
    try {
      await usersApi.revoke(userId);
      show("Access revoked.", "success");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not revoke this user's access.", "error");
    } finally {
      setActingOn(null);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Permanently delete this user? This can't be undone.")) return;
    setActingOn(userId);
    try {
      await usersApi.remove(userId);
      show("User deleted.", "success");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not delete this user.", "error");
    } finally {
      setActingOn(null);
    }
  }

  async function handleNameSave(userId: string) {
    const raw = nameEdits[userId];
    if (raw === undefined || !raw.trim()) return;
    try {
      await usersApi.update(userId, { full_name: raw.trim() });
      show("Name updated.", "success");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not update the name.", "error");
    }
  }

  async function handleWhatsappSave(userId: string) {
    const raw = whatsappEdits[userId];
    if (raw === undefined) return;
    try {
      await usersApi.update(userId, { whatsapp_number: raw.trim() || null });
      show("WhatsApp number updated.", "success");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not update the WhatsApp number.", "error");
    }
  }

  if (loading) return <TableSkeleton rows={4} />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Staff</h1>

      <form onSubmit={handleInvite} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700">Invite staff by email</h2>
        <Input label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          label="WhatsApp number (optional, e.g. +919876543210)"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
        />
        <Button type="submit" loading={inviting}>
          Send invite
        </Button>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">All users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="pb-2">Name</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">WhatsApp number</th>
                <th className="pb-2">Since</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const isSelfOrOwner = u.role === "owner" || u.id === profile?.id;
                return (
                  <tr key={u.id}>
                    <td className="py-2">
                      <input
                        className="w-36 rounded-md border border-gray-300 px-2 py-1 text-sm font-medium text-gray-900"
                        defaultValue={u.full_name}
                        onChange={(e) => setNameEdits((prev) => ({ ...prev, [u.id]: e.target.value }))}
                        onBlur={() => handleNameSave(u.id)}
                      />
                    </td>
                    <td className="py-2 capitalize text-gray-600">{u.role}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[u.approval_status]}`}>
                        {u.approval_status}
                      </span>
                    </td>
                    <td className="py-2">
                      <input
                        className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm"
                        placeholder="+91…"
                        defaultValue={u.whatsapp_number ?? ""}
                        onChange={(e) => setWhatsappEdits((prev) => ({ ...prev, [u.id]: e.target.value }))}
                        onBlur={() => handleWhatsappSave(u.id)}
                      />
                    </td>
                    <td className="py-2 text-gray-500">{formatDDMMYYYY(u.created_at)}</td>
                    <td className="py-2 text-right">
                      {!isSelfOrOwner && (
                        <div className="flex justify-end gap-2">
                          {u.approval_status === "pending" && (
                            <>
                              <button
                                onClick={() => handleApprove(u.id)}
                                disabled={actingOn === u.id}
                                className="rounded-lg px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(u.id)}
                                disabled={actingOn === u.id}
                                className="rounded-lg px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {u.approval_status === "approved" && (
                            <button
                              onClick={() => handleRevoke(u.id)}
                              disabled={actingOn === u.id}
                              className="rounded-lg px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                            >
                              Revoke access
                            </button>
                          )}
                          {(u.approval_status === "rejected" || u.approval_status === "revoked") && (
                            <button
                              onClick={() => handleApprove(u.id)}
                              disabled={actingOn === u.id}
                              className="rounded-lg px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                            >
                              Restore access
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(u.id)}
                            disabled={actingOn === u.id}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
