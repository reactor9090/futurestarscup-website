"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";

export type FormState = { error?: string; ok?: string };

type ServerAction = (prev: FormState, formData: FormData) => Promise<FormState>;

const PendingContext = createContext(false);

// Formular legat de un Server Action. Spre deosebire de <form action>, nu golește
// câmpurile când validarea eșuează: se golesc doar după succes, și doar cu `resetOnSuccess`.
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: ServerAction;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          await formAction(data);
        });
      }}
    >
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
      <FormMessage state={state} onSuccess={resetOnSuccess ? () => ref.current?.reset() : undefined} />
    </form>
  );
}

function FormMessage({ state, onSuccess }: { state: FormState; onSuccess?: () => void }) {
  // `state` e un obiect nou la fiecare rezultat, deci golim formularul o dată per succes.
  useEffect(() => {
    if (state.ok) onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (state.error) {
    return (
      <p role="alert" className="mt-2 w-full rounded-md bg-red-50 px-3 py-2 text-sm text-danger">
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p role="status" className="mt-2 w-full rounded-md bg-pitch-50 px-3 py-2 text-sm text-pitch-700">
        {state.ok}
      </p>
    );
  }
  return null;
}

const variants = {
  primary: "px-3.5 py-2 text-sm bg-pitch-700 text-white hover:bg-pitch-800",
  secondary: "px-3.5 py-2 text-sm border border-line bg-white hover:bg-canvas",
  danger: "px-3.5 py-2 text-sm border border-red-200 bg-white text-danger hover:bg-red-50",
  // Acțiune mică, în rânduri de listă (ex. „Scoate din grupă”).
  ghost: "px-2 py-1 text-xs font-medium text-muted hover:bg-red-50 hover:text-danger",
};

export function SubmitButton({
  children,
  variant = "primary",
  confirm,
  disabled,
  title,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  /** Dacă e setat, cere confirmare înainte de trimitere. */
  confirm?: string;
  disabled?: boolean;
  title?: string;
}) {
  const pending = useContext(PendingContext);
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      title={title}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={`rounded-md font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]}`}
    >
      {pending && variant !== "ghost" ? "Se salvează…" : children}
    </button>
  );
}
