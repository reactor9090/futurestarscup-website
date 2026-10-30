import type { Metadata } from "next";
import { PageHeader, UnderConstruction } from "@/components/page-header";

export const metadata: Metadata = { title: "Jucători" };

export default function JucatoriPage() {
  return (
    <>
      <PageHeader
        title="Jucători"
        description="Toți jucătorii campionatului și statisticile lor."
      />
      <UnderConstruction
        items={[
          "Căutare după nume",
          "Filtrare după categorie și sortare după goluri, pase decisive, meciuri",
          "Profil individual pentru fiecare jucător",
        ]}
      />
    </>
  );
}
