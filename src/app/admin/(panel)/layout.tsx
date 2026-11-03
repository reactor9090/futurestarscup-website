import { connection } from "next/server";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";
import { AdminNav, AdminNavLinks } from "./admin-nav";

// Verificarea de admin citește cookie-uri, deci stă în spatele unui <Suspense>.
async function AdminGate({ children }: { children: React.ReactNode }) {
  // Sesiunea (și expirarea ei, care citește ora) există doar la cerere, niciodată în pagina pre-randată.
  await connection();
  const { user } = await requireAdmin();
  return (
    <>
      <div className="flex items-center justify-end gap-3 border-b border-line bg-surface px-4 py-3 sm:px-8">
        <span className="truncate text-sm text-muted">{user.email}</span>
        <form action={logout}>
          <button type="submit" className="rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:bg-canvas">
            Ieșire
          </button>
        </form>
      </div>
      <div className="px-4 py-8 sm:px-8">{children}</div>
    </>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="bg-pitch-950 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0">
        <div className="flex h-16 items-center px-5">
          <Logo href="/admin" />
        </div>
        <Suspense fallback={<AdminNavLinks pathname="" />}>
          <AdminNav />
        </Suspense>
      </aside>
      <main className="min-w-0 flex-1">
        <Suspense fallback={<p className="p-8 text-muted">Se încarcă…</p>}>
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </main>
    </div>
  );
}
