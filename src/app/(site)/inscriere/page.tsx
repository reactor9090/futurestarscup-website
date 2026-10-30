import type { Metadata } from "next";
import { PageHeader, UnderConstruction } from "@/components/page-header";

export const metadata: Metadata = { title: "Înscrie echipa" };

export default function InscrierePage() {
  return (
    <>
      <PageHeader
        title="Înscrie echipa"
        description="Înscrie-ți echipa în campionat completând formularul online."
      />
      <UnderConstruction
        items={[
          "Datele echipei și ale antrenorului",
          "Lotul de jucători — adaugi sau elimini jucători direct din formular",
          "Confirmarea înscrierii după aprobarea organizatorilor",
        ]}
      />
    </>
  );
}
