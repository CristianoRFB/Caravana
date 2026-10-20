export type DiagnosticKind = "operation" | "render" | "unhandled";
const codes = ["permission-denied", "unavailable", "deadline-exceeded", "resource-exhausted", "unauthenticated", "failed-precondition", "aborted", "invalid-argument", "internal", "network-request-failed", "too-many-requests"] as const;
export interface DiagnosticEvent { kind: DiagnosticKind; code: string; minuteUtc: string }
let events: readonly DiagnosticEvent[] = [];
let privateScope = "public";
let epoch = 0;
let seen = new WeakSet<object>();
const observers = new Set<()=>void>();
function publish() { for (const observer of observers) { try { observer(); } catch { /* Diagnostics must not break an application operation. */ } } }
export function setDiagnosticScope(scope: string) { if (scope !== privateScope) { privateScope=scope; clearDiagnostics(); } }
export function clearDiagnostics() { epoch++;seen=new WeakSet<object>();events=Object.freeze([]);publish(); }
export const captureDiagnosticContext = () => epoch;
export const diagnosticSnapshot = () => events;
export function observeDiagnostics(observer:()=>void) { observers.add(observer); return ()=>{observers.delete(observer);}; }
export function recordDiagnosticFailure(cause: unknown, kind: DiagnosticKind = "operation", context = epoch) {
  if(context !== epoch)return;
  if(cause && typeof cause === "object"){if(seen.has(cause))return;seen.add(cause);}
  let code="unknown";
  try { if(cause && typeof cause === "object" && "code" in cause && typeof cause.code === "string") { const value=cause.code.split("/").at(-1);if((codes as readonly string[]).includes(value || ""))code=value!; } } catch { /* Do not inspect raw messages, payloads or getters further. */ }
  const minuteUtc = new Date(Math.floor(Date.now()/60000)*60000).toISOString();
  events=Object.freeze([...events.slice(-49),Object.freeze({kind,code,minuteUtc})]);publish();
}
export function diagnosticReport() { return {version:"client-diagnostics-v1",scope:"Current in-memory tab context only; no delivery service or server audit",events:events.map(event=>({...event}))}; }
export function installDiagnosticHandlers(target: EventTarget) {
  const error=(event:Event)=>recordDiagnosticFailure((event as ErrorEvent).error,"unhandled");
  const rejection=(event:Event)=>recordDiagnosticFailure((event as PromiseRejectionEvent).reason,"unhandled");
  target.addEventListener("error",error);target.addEventListener("unhandledrejection",rejection);
  return ()=>{target.removeEventListener("error",error);target.removeEventListener("unhandledrejection",rejection);};
}
