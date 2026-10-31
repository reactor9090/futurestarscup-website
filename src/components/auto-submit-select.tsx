"use client";

/** Listă care trimite formularul imediat ce alegi o opțiune (fără buton „Aplică”). */
export function AutoSubmitSelect(props: Omit<React.ComponentProps<"select">, "onChange">) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
