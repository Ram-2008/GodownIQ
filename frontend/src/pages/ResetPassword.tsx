import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export function ResetPasswordPage() {
  const { session, isPasswordRecovery, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // A normal signed-in user (not here via a recovery link) has nothing to do on this page.
  // `updatePassword` flips `isPasswordRecovery` back off on success, so `done` must win here
  // or the confirmation screen below would redirect away the instant it appears.
  if (session && !isPasswordRecovery && !done) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your password.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 text-center">
        <div className="max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-lg font-bold text-brand-700">Password updated</h1>
          <p className="text-sm text-gray-600">You can now use your new password to sign in.</p>
          <Link to="/" className="mt-4 inline-block text-sm font-medium text-brand-700">
            Continue to GodownIQ
          </Link>
        </div>
      </div>
    );
  }

  if (!isPasswordRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 text-center">
        <div className="max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-lg font-bold text-brand-700">Link invalid or expired</h1>
          <p className="text-sm text-gray-600">
            This password reset link no longer works. Request a new one and use it within a few minutes of receiving it.
          </p>
          <Link to="/forgot-password" className="mt-4 inline-block text-sm font-medium text-brand-700">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-brand-700">Set a new password</h1>
        <p className="mb-6 text-sm text-gray-500">Choose a new password for your account.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
