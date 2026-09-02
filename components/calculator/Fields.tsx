"use client";

import type { FormField, FormStep } from "@/lib/engine/types";
import { Field, inputClass, selectClass } from "@/components/ui";
import { track } from "@/lib/analytics";

type Values = Record<string, unknown>;

export interface FieldOptions {
  materials: { value: string; label: string; hint?: string }[];
  projectTypes: { value: string; label: string; hint?: string }[];
}

/**
 * One field renderer, driven entirely by the engine's declared FormField
 * definitions. The calculator, the quote checker and the comparison tool all
 * use it, so a new service that declares different fields gets a working form
 * with no UI work.
 */
export function StepFields({ step, values, set, options }: {
  step: FormStep; values: Values; set: (n: string, v: unknown) => void;
  options: FieldOptions;
}) {
  return (
    <>
      {step.fields
        .filter((f) => (f.showWhen ? f.showWhen(values) : true))
        .map((f) => (
          <FieldControl key={f.name} field={f} values={values} set={set} options={options} />
        ))}
    </>
  );
}

function FieldControl({ field, values, set, options }: {
  field: FormField; values: Values; set: (n: string, v: unknown) => void;
  options: FieldOptions;
}) {
  const id = `f-${field.name}`;
  const raw = values[field.name];
  const value = raw === undefined || raw === null ? "" : String(raw);
  const list = field.optionsFrom ? options[field.optionsFrom] : field.options;
  const selected = list?.find((o) => o.value === value);

  if (field.type === "toggle") {
    return (
      <label className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={raw === true}
          onChange={(e) => set(field.name, e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong accent-[#0C6B58]"
        />
        <span>
          <span className="block text-[14px] font-medium text-ink">{field.label}</span>
          {field.hint && <span className="block text-[12.5px] text-faint">{field.hint}</span>}
        </span>
      </label>
    );
  }

  if (field.type === "select" && list) {
    return (
      <Field label={field.label} hint={selected?.hint ?? field.hint} htmlFor={id}>
        <select
          id={id}
          className={selectClass}
          value={value}
          onChange={(e) => set(field.name, e.target.value)}
        >
          {!value && <option value="">Select...</option>}
          {list.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>
    );
  }

  if (field.type === "number") {
    return (
      <Field label={field.label} hint={field.hint} htmlFor={id} suffix={field.suffix}>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={field.min}
          max={field.max}
          className={inputClass}
          value={value}
          onChange={(e) => set(field.name, e.target.value === "" ? "" : Number(e.target.value))}
        />
      </Field>
    );
  }

  return (
    <Field label={field.label} hint={field.hint} htmlFor={id}>
      <input
        id={id}
        type="text"
        inputMode={field.name === "zip" ? "numeric" : "text"}
        maxLength={field.name === "zip" ? 5 : undefined}
        placeholder={field.name === "zip" ? "e.g. 85018" : undefined}
        className={inputClass}
        value={value}
        onChange={(e) => {
          const v = field.name === "zip" ? e.target.value.replace(/\D/g, "").slice(0, 5) : e.target.value;
          set(field.name, v);
          if (field.name === "zip" && v.length === 5) track("zip_searched", { zip: v });
        }}
      />
    </Field>
  );
}
