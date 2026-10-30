"use client";

import { useActionState } from "react";
import { login, type LoginState } from "../../actions";

const inputClass =
  "mt-1 block w-full rounded-md border border-line bg-white px-3 py-2.5 outline-none focus:border-pitch-500 focus:ring-2 focus:ring-pitch-500/20";

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const error = state.error ?? notice;

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-medium">
        Email
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
      </label>
      <label className="block text-sm font-medium">
        Parolă
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </label>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-pitch-700 px-4 py-2.5 font-semibold text-white hover:bg-pitch-800 disabled:opacity-60"
      >
        {pending ? "Se verifică…" : "Intră în panou"}
      </button>
    </form>
  );
}
