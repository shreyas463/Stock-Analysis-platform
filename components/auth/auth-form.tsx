"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BasisLogo } from "@/components/shell/logo";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: z.string().email("Enter a valid email"),
  username: z
    .string()
    .min(3, "At least 3 characters")
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, underscores"),
  password: z.string().min(8, "At least 8 characters"),
});

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const schema = mode === "login" ? loginSchema : registerSchema;

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(schema as never),
    defaultValues: { email: "", username: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        toast.error(data?.error?.message ?? "Something went wrong");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-6 shadow-xs">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <BasisLogo className="size-8" />
        <h1 className="text-lg font-semibold">
          {mode === "login" ? "Sign in to Basis" : "Create your Basis account"}
        </h1>
        <p className="text-xs text-ink-muted">
          Evidence-based research & paper trading. No real money involved.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p role="alert" className="text-xs text-neg">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        {mode === "register" && (
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              autoComplete="username"
              placeholder="satoshi"
              {...form.register("username")}
            />
            {form.formState.errors.username && (
              <p role="alert" className="text-xs text-neg">
                {form.formState.errors.username.message}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p role="alert" className="text-xs text-neg">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <div className="mt-4 text-center text-xs text-ink-muted">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/register" className="text-brand hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-brand hover:underline">
              Sign in
            </Link>
          </>
        )}
      </div>

      {mode === "login" && (
        <div className="mt-4 rounded-md border border-line bg-panel-2 p-2.5 text-center text-xs text-ink-muted">
          Demo account: <span className="font-mono">demo@basis.app</span> /{" "}
          <span className="font-mono">demo1234</span>
        </div>
      )}
    </div>
  );
}
