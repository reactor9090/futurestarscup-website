import type { Metadata } from "next";

export const metadata: Metadata = { title: "Panou admin", robots: { index: false } };

export default function AdminHomePage() {
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Panou de administrare</h1>
      <p className="mt-2 text-muted">
        De aici vei gestiona sezoanele, echipele, jucătorii, meciurile și rezultatele. Clasamentele și statisticile
        se calculează automat din rezultatele introduse.
      </p>
    </div>
  );
}
