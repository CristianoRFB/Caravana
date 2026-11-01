import { useEffect, useId, useRef, useState, type ComponentPropsWithoutRef } from "react";

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
interface Issue { control: Control; id: string; message: string }
function isControl(element: Element): element is Control {
  return element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;
}
function explanation(control: Control) {
  const label = (control.labels?.[0]?.querySelector("span")?.textContent || control.labels?.[0]?.textContent || control.getAttribute("aria-label") || "este campo").replace(/\*/g, "").trim();
  if (control.validity.valueMissing) return control instanceof HTMLInputElement && control.type === "checkbox" ? `Confirme: ${label}.` : `Preencha o campo ${label}.`;
  if (control.validity.typeMismatch && control instanceof HTMLInputElement && control.type === "email") return `Digite um e-mail válido em ${label}.`;
  if (control.validity.tooShort && !(control instanceof HTMLSelectElement)) return `Use pelo menos ${control.minLength} caracteres em ${label}.`;
  if (control.validity.tooLong && !(control instanceof HTMLSelectElement)) return `Use no máximo ${control.maxLength} caracteres em ${label}.`;
  if (control instanceof HTMLInputElement) {
    const limit = (value: string) => control.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split("-").reverse().join("/") : value.replace(".", ",");
    if (control.validity.rangeOverflow) return `Use no máximo ${limit(control.max)} em ${label}.`;
    if (control.validity.rangeUnderflow) return `Use no mínimo ${limit(control.min)} em ${label}.`;
    if (control.validity.stepMismatch) return `Use um valor compatível com o incremento ${limit(control.step || "1")} em ${label}.`;
  }
  // Preserve the browser's explanation for constraints not translated above.
  return `${label}: ${control.validationMessage}`;
}

/** Presents native constraint failures; submit handlers and backend validation stay unchanged. */
export default function FormFeedback({ children, onSubmit, ...props }: ComponentPropsWithoutRef<"form">) {
  const prefix = useId().replaceAll(":", "");
  const sequence = useRef(0), focusPending = useRef(false), queued = useRef(false);
  const summary = useRef<HTMLDivElement>(null);
  const originals = useRef(new Map<Control, { invalid: string | null; description: string | null; errorId: string }>());
  const [issues, setIssues] = useState<Issue[]>([]);

  function restore(control: Control) {
    const saved = originals.current.get(control);
    if (!saved) return;
    for (const [attribute, value] of [["aria-invalid", saved.invalid], ["aria-describedby", saved.description]] as const) {
      if (value === null) control.removeAttribute(attribute); else control.setAttribute(attribute, value);
    }
    originals.current.delete(control);
  }
  function collect(form: HTMLFormElement, focus: boolean) {
    if (!form.isConnected) return;
    const invalid = Array.from(form.elements).filter(isControl).filter(control => control.willValidate && !control.validity.valid);
    for (const control of originals.current.keys()) if (!invalid.includes(control)) restore(control);
    const next = invalid.map(control => {
      if (!control.id) control.id = `${prefix}-field-${++sequence.current}`;
      if (!originals.current.has(control)) originals.current.set(control, { invalid: control.getAttribute("aria-invalid"), description: control.getAttribute("aria-describedby"), errorId: `${prefix}-error-${++sequence.current}` });
      const saved = originals.current.get(control)!;
      control.setAttribute("aria-invalid", "true");
      control.setAttribute("aria-describedby", [saved.description, saved.errorId].filter(Boolean).join(" "));
      return { control, id: saved.errorId, message: explanation(control) };
    });
    focusPending.current = focus;
    setIssues(next);
  }
  useEffect(() => {
    if (focusPending.current && issues.length) {
      focusPending.current = false;
      summary.current?.focus();
      summary.current?.scrollIntoView({ block: "center" });
    }
  }, [issues]);

  return <form {...props} onInvalidCapture={event => {
    // Keep the browser's validity gate; replace competing tooltip bubbles with one linked summary.
    event.preventDefault();
    const form = event.currentTarget;
    if (!queued.current) {
      queued.current = true;
      queueMicrotask(() => { queued.current = false; collect(form, true); });
    }
  }} onInputCapture={event => {
    if (issues.length) {
      const form = event.currentTarget;
      // React's onChange may mount/unmount required fields; read the committed form.
      queueMicrotask(() => collect(form, false));
    }
  }} onSubmit={event => {
    for (const control of originals.current.keys()) restore(control);
    setIssues([]);
    onSubmit?.(event);
  }}>
    {issues.length > 0 && <div className="validation-summary field-full" role="alert" aria-labelledby={`${prefix}-title`} tabIndex={-1} ref={summary}>
      <h2 id={`${prefix}-title`}>Confira os campos indicados</h2>
      <p>Seus dados continuam preenchidos. Selecione um item para corrigir.</p>
      <ul>{issues.map(issue => <li key={issue.id} id={issue.id}><a href={`#${encodeURIComponent(issue.control.id)}`} onClick={event => {
        event.preventDefault(); issue.control.focus({ preventScroll: true }); issue.control.scrollIntoView({ block: "center" });
      }}>{issue.message}</a></li>)}</ul>
    </div>}
    {children}
  </form>;
}
