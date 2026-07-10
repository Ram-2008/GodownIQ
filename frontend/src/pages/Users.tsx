import { useCallback, useEffect, useState } from "react";
import { usersApi, UserProfile } from "../api/users";
import { useToast } from "../components/Toast";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { TableSkeleton } from "../components/ui/Skeleton";
import { formatDDMMYYYY } from "../utils/date";

export function UsersPage() {
  const { show } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [inviting, setInviting] = useState(false);

  const [whatsappEdits, setWhatsappEdits] = useState<Record<string, string>>({});

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
                <th className="pb-2">WhatsApp number</th>
                <th className="pb-2">Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-2 font-medium text-gray-900">{u.full_name}</td>
                  <td className="py-2 capitalize text-gray-600">{u.role}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
