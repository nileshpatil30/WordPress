"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/admin/actions";
import { Button, Callout, Field, inputClass } from "@/components/ui";

const INITIAL: ActionState = { ok: false };

export function LoginForm({ action }: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  return (
    <form action={formAction} className="w-full max-w-sm">
      <Field label="Admin password" hint="Set ADMIN_PASSWORD in your environment.">
        <input name="password" type="password" className={inputClass} autoComplete="current-password" />
      </Field>
      {state.message && (
        <div className="mt-4"><Callout tone="danger">{state.message}</Callout></div>
      )}
      <Button type="submit" disabled={pending} className="mt-5 w-full" size="lg">
        {pending ? "Checking..." : "Sign in"}
      </Button>
    </form>
  );
}

/**
 * One inline editor used by every admin table. Fields are declared by the page,
 * so adding an editable column is a one-line change rather than a new form.
 */
export function InlineEditForm({
  action, collection, id, returnTo, fields, compact = false,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  collection: string;
  id: string;
  returnTo: string;
  fields: { name: string; label: string; value: string | number; type?: string; width?: string }[];
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  return (
    <form action={formAction} className={compact ? "flex flex-wrap items-end gap-2" : "space-y-3"}>
      <input type="hidden" name="collection" value={collection} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {fields.map((f) => (
        <label key={f.name} className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">
            {f.label}
          </span>
          <input
            name={f.name}
            defaultValue={String(f.value)}
            type={f.type ?? "text"}
            step="any"
            className={`${inputClass} py-1.5 text-[13px] ${f.width ?? "w-28"}`}
          />
        </label>
      ))}
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "..." : "Save"}
      </Button>
      {state.message && (
        <span className={`text-[12px] ${state.ok ? "text-positive" : "text-danger"}`}>{state.message}</span>
      )}
    </form>
  );
}

export function ReviewForm({ action, id }: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  id: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input
        name="moderationNotes"
        placeholder="Reviewer note (optional)"
        className={`${inputClass} w-56 py-1.5 text-[13px]`}
      />
      <Button type="submit" name="status" value="approved" size="sm" disabled={pending}>Approve</Button>
      <Button type="submit" name="status" value="rejected" size="sm" variant="secondary" disabled={pending}>
        Reject
      </Button>
      {state.message && (
        <span className={`text-[12px] ${state.ok ? "text-positive" : "text-danger"}`}>{state.message}</span>
      )}
    </form>
  );
}
