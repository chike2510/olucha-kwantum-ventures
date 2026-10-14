import { forwardRef, useId, useImperativeHandle, useRef, type KeyboardEvent } from "react";
import { Check } from "lucide-react";

export type VariantOption = { value: string; label?: string; swatch?: string; disabled?: boolean };

export type VariantSelectorHandle = { focus: () => void };

type VariantSelectorProps = {
  label: string;
  options: VariantOption[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  /** Renders round colour swatches instead of text pills. */
  kind?: "pill" | "swatch";
};

/**
 * Accessible single-choice variant picker (WAI-ARIA radio group pattern):
 * one tab stop, arrow keys move + select, Space/Enter selects, disabled options are skipped.
 */
const VariantSelector = forwardRef<VariantSelectorHandle, VariantSelectorProps>(function VariantSelector(
  { label, options, value, onChange, required, error, kind = "pill" },
  ref,
) {
  const labelId = useId();
  const errorId = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const enabled = options.map((option, index) => (option.disabled ? -1 : index)).filter((index) => index >= 0);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const tabStop = selectedIndex >= 0 && !options[selectedIndex].disabled ? selectedIndex : enabled[0];
  const selected = options[selectedIndex];

  useImperativeHandle(ref, () => ({ focus: () => buttons.current[tabStop ?? 0]?.focus() }), [tabStop]);

  const move = (from: number, step: 1 | -1) => {
    if (!enabled.length) return;
    const position = enabled.indexOf(from);
    const nextIndex = enabled[(position + step + enabled.length) % enabled.length];
    onChange(options[nextIndex].value);
    buttons.current[nextIndex]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); move(index, 1); }
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); move(index, -1); }
    else if (event.key === "Home") { event.preventDefault(); const first = enabled[0]; if (first !== undefined) { onChange(options[first].value); buttons.current[first]?.focus(); } }
    else if (event.key === "End") { event.preventDefault(); const last = enabled[enabled.length - 1]; if (last !== undefined) { onChange(options[last].value); buttons.current[last]?.focus(); } }
  };

  return (
    <fieldset className="mt-7 min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span id={labelId} className="text-sm font-semibold text-slate-700">
          {label}
          {required ? <span className="text-rose-600" aria-hidden="true"> *</span> : <span className="ml-1.5 text-xs font-medium text-slate-400">(optional)</span>}
        </span>
        <span className="truncate text-sm text-slate-500" aria-live="polite">{selected ? selected.value : ""}</span>
      </div>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="mt-3 flex flex-wrap gap-2.5"
      >
        {options.map((option, index) => {
          const checked = option.value === value;
          const text = option.label || option.value;
          return (
            <button
              key={option.value}
              ref={(node) => { buttons.current[index] = node; }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-disabled={option.disabled || undefined}
              aria-label={kind === "swatch" ? text : undefined}
              title={kind === "swatch" ? text : undefined}
              tabIndex={index === tabStop ? 0 : -1}
              onClick={() => { if (!option.disabled) onChange(option.value); }}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={kind === "swatch"
                ? `variant-chip relative flex h-11 w-11 items-center justify-center rounded-full border-2 ${checked ? "border-[#0b1736] shadow-[0_0_0_3px_rgba(207,164,58,.45)]" : error ? "border-rose-300" : "border-slate-200 hover:border-[#1f5b9f]/50"} ${option.disabled ? "cursor-not-allowed opacity-40" : ""}`
                : `variant-chip inline-flex min-h-11 min-w-[3.25rem] items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-semibold ${checked ? "border-[#0b1736] bg-[#0b1736] text-white shadow-[0_8px_20px_rgba(11,23,54,.18)]" : error ? "border-rose-300 bg-white text-slate-700" : "border-slate-200 bg-white text-slate-700 hover:border-[#1f5b9f]/50 hover:text-[#1f5b9f]"} ${option.disabled ? "cursor-not-allowed bg-slate-50 text-slate-300 line-through hover:border-slate-200 hover:text-slate-300" : ""}`}
            >
              {kind === "swatch" ? (
                <span className="flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-inset ring-black/10" style={{ background: option.swatch || "#e2e8f0" }}>
                  {checked && <Check size={15} strokeWidth={3} className={isLight(option.swatch) ? "text-[#0b1736]" : "text-white"} aria-hidden="true" />}
                </span>
              ) : (
                <>{checked && <Check size={14} strokeWidth={3} aria-hidden="true" />}{text}</>
              )}
            </button>
          );
        })}
      </div>
      {error && <p id={errorId} className="mt-2 text-sm font-medium text-rose-600" role="alert">{error}</p>}
    </fieldset>
  );
});

function isLight(color?: string) {
  if (!color || !color.startsWith("#") || color.length < 7) return true;
  const [r, g, b] = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16));
  return r * 0.299 + g * 0.587 + b * 0.114 > 170;
}

export default VariantSelector;
