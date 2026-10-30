import type { Metadata } from "next";
import { PageHeader, UnderConstruction } from "@/components/page-header";

export const metadata: Metadata = { title: "Premii și sponsori" };

export default function PremiiPage() {
  return (
    <>
      <PageHeader
        title="Premii și sponsori"
        description="Trofeele puse în joc, câștigătorii și partenerii campionatului."
      />
      <UnderConstruction
        items={[
          "Premiile fiecărei competiții",
          "Câștigătorii și premiile obținute",
          "Sponsorii și partenerii",
        ]}
      />
    </>
  );
}
