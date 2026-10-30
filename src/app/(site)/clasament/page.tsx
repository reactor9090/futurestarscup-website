import type { Metadata } from "next";
import { PageHeader, UnderConstruction } from "@/components/page-header";

export const metadata: Metadata = { title: "Clasament" };

export default function ClasamentPage() {
  return (
    <>
      <PageHeader
        title="Clasament"
        description="Clasamentul fiecărei categorii de vârstă, calculat automat după fiecare rezultat."
      />
      <UnderConstruction
        items={[
          "Clasament pe categorii de vârstă și pe grupe",
          "Meciuri jucate, victorii, egaluri, înfrângeri, golaveraj și puncte",
          "Link direct spre pagina fiecărei echipe",
        ]}
      />
    </>
  );
}
