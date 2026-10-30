import type { Metadata } from "next";
import { PageHeader, UnderConstruction } from "@/components/page-header";

export const metadata: Metadata = { title: "Meciuri" };

export default function MeciuriPage() {
  return (
    <>
      <PageHeader
        title="Meciuri"
        description="Programul și rezultatele, organizate pe etape și categorii."
      />
      <UnderConstruction
        items={[
          "Programul meciurilor: data, ora și terenul",
          "Rezultatele finale, cu marcatori și pase decisive",
          "Filtre după categorie, etapă și status",
        ]}
      />
    </>
  );
}
