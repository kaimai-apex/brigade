"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-provider";

export function DemoGateForm() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const password = new FormData(e.currentTarget).get("password")?.toString() ?? "";

    try {
      const res = await fetch("/api/demo/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        userId?: string;
        next?: string;
        message?: string;
      };

      if (!res.ok || !data.userId) {
        setError(data.message ?? "Could not open the demo. Try again.");
        return;
      }

      setSession({ userId: data.userId });
      router.push(data.next && data.next.startsWith("/") ? data.next : "/directory");
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
      <div>
        <Label htmlFor="demo-password">Demo password</Label>
        <Input
          id="demo-password"
          name="password"
          type="password"
          autoComplete="off"
          autoFocus
          required
        />
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-rust">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Opening demo…" : "Enter demo"}
      </Button>
    </form>
  );
}
