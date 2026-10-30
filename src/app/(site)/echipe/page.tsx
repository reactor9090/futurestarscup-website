import type { Metadata } from "next";
import { PageHeader, UnderConstruction } from "@/components/page-header";

export const metadata: Metadata = { title: "Echipe" };

export default function EchipePage() {
  return (
    <>
      <PageHeader
        title="Echipe"
        description="Toate echipele participante."
      />
      <UnderConstruction
        items={[
          "Căutare după nume",
          "Filtrare după categorie și sortare după diferite criterii",
          "Profil echipă: lot, statistici, istoricul meciurilor",
        ]}
      />
    </>
  );
}
