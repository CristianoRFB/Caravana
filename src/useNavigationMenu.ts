import { useCallback, useEffect, useRef, useState } from "react";

export function useNavigationMenu() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }, []);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); close(); } };
    const resize = () => { if (window.matchMedia("(min-width: 651px)").matches) close(false); };
    const overflow = document.body.style.overflow;
    if (window.matchMedia("(max-width: 650px)").matches) document.body.style.overflow = "hidden";
    document.addEventListener("keydown", escape); window.addEventListener("resize", resize);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", escape); window.removeEventListener("resize", resize); };
  }, [open, close]);
  return { open, trigger, close, toggle: () => setOpen(value => !value) };
}
