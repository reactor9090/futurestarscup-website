import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState } from "@/components/competition-picker";
import { PageHeader } from "@/components/page-header";
import { getOpenCompetitions } from "@/lib/public-data";
import { RegistrationForm } from "./registration-form";

export const metadata: Metadata = { title: "Înscrie echipa" };

export default function InscrierePage() {
  return (
    <>
      <PageHeader
        title="Înscrie echipa"
        description="Înscrie-ți echipa în campionat completând formularul online. Organizatorii îl verifică și aprobă."
      />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Suspense fallback={<p className="text-muted">Se încarcă…</p>}>
          <Form />
        </Suspense>
      </div>
    </>
  );
}

async function Form() {
  const competitions = await getOpenCompetitions();
  if (competitions.length === 0) {
    return <EmptyState>Înscrierile nu sunt deschise momentan. Revino în curând!</EmptyState>;
  }
  return <RegistrationForm competitions={competitions} />;
}
