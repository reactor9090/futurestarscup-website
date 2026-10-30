import type { Metadata } from "next";
import { PageHeader, UnderConstruction } from "@/components/page-header";

export const metadata: Metadata = { title: "Golgheteri" };

export default function GolgheteriPage() {
  return (
    <>
      <PageHeader
        title="Golgheteri"
        description="Cei mai buni marcatori ai fiecărei categorii."
      />
      <UnderConstruction
        items={[
          "Clasamentul golgheterilor pe categorie",
          "Goluri, pase decisive și meciuri jucate",
        ]}
      />
    </>
  );
}
