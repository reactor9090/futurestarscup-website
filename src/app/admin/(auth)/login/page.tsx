import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Autentificare admin", robots: { index: false } };

async function LoginFormWithNotice({ searchParams }: { searchParams: PageProps<"/admin/login">["searchParams"] }) {
  const { eroare } = await searchParams;
  return (
    <LoginForm notice={eroare === "fara-acces" ? "Contul tău nu are drepturi de administrator." : undefined} />
  );
}

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main className="grid flex-1 place-items-center bg-pitch-950 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-xl bg-surface p-6 shadow-xl sm:p-8">
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Panou de administrare</h1>
          <p className="mb-6 mt-1 text-sm text-muted">Doar pentru organizatori.</p>
          <Suspense fallback={<LoginForm />}>
            <LoginFormWithNotice searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
