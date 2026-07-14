import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export function StaffSignupRequestPage() {
  const { session, signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signUp(email, password, fullName);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the request.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 text-center">
        <div className="max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-lg font-bold text-brand-700">Request sent</h1>
          <p className="text-sm text-gray-600">
            Confirm your email if asked, then wait for the warehouse owner to approve your account. You'll be able to
            sign in as soon as that happens.
          </p>
          <Link to="/login" className="mt-4 inline-block text-sm font-medium text-brand-700">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-brand-700">Request staff access</h1>
        <p className="mb-6 text-sm text-gray-500">
          Creates your account, but you can't sign in until the warehouse owner approves it.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            Send request
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already approved? <Link to="/login" className="font-medium text-brand-700">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
