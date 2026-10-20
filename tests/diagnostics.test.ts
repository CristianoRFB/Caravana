import { afterEach, describe, expect, it } from "vitest";
import { captureDiagnosticContext, clearDiagnostics, diagnosticReport, diagnosticSnapshot, installDiagnosticHandlers, observeDiagnostics, recordDiagnosticFailure, setDiagnosticScope } from "../src/lib/diagnostics";
import { pendingWrites, trackWrite } from "../src/lib/pending-writes";
afterEach(()=>{setDiagnosticScope("public");clearDiagnostics();expect(pendingWrites()).toBe(0);});
describe("bounded private client diagnostics without payload or outbound delivery",()=>{
  it("stores only whitelisted code/category/coarse time and never serializes payload, identity, links or secrets",()=>{
    setDiagnosticScope("PRIVATE_UID:PRIVATE_ORG");recordDiagnosticFailure({code:"firestore/permission-denied",message:"CPF_PRIVATE PASSWORD_PRIVATE",stack:"TOKEN_PRIVATE",url:"PRIVATE_LINK",passengerName:"PRIVATE_NAME"});
    const report=JSON.stringify(diagnosticReport());for(const secret of ["PRIVATE_UID","PRIVATE_ORG","CPF_PRIVATE","PASSWORD_PRIVATE","TOKEN_PRIVATE","PRIVATE_LINK","PRIVATE_NAME"])expect(report).not.toContain(secret);
    expect(diagnosticSnapshot()[0]).toMatchObject({kind:"operation",code:"permission-denied"});expect(diagnosticSnapshot()[0].minuteUtc).toMatch(/:00\.000Z$/);
    recordDiagnosticFailure({code:"PRIVATE_CODE",message:"OTHER_PRIVATE"});expect(diagnosticSnapshot()[1].code).toBe("unknown");
  });
  it("bounds records, clears on tenant/logout transition and ignores late failures from the previous tenant",()=>{
    setDiagnosticScope("tenant-a");const old=captureDiagnosticContext();for(let i=0;i<70;i++)recordDiagnosticFailure({code:"unavailable"});expect(diagnosticSnapshot()).toHaveLength(50);
    setDiagnosticScope("tenant-b");expect(diagnosticSnapshot()).toHaveLength(0);recordDiagnosticFailure({code:"unavailable"},"operation",old);expect(diagnosticSnapshot()).toHaveLength(0);
    recordDiagnosticFailure({code:"aborted"});setDiagnosticScope("public");expect(diagnosticSnapshot()).toHaveLength(0);
  });
  it("preserves original errors and pending counters, deduplicates nested transaction reporting and tolerates observers",async()=>{
    const cause={code:"permission-denied",message:"private"};const stop=observeDiagnostics(()=>{throw Error("observer");});
    await expect(trackWrite(()=>trackWrite(async()=>{throw cause;}))).rejects.toBe(cause);expect(pendingWrites()).toBe(0);expect(diagnosticSnapshot()).toHaveLength(1);stop();
    expect(await trackWrite(async()=>123)).toBe(123);expect(diagnosticSnapshot()).toHaveLength(1);
  });
  it("handles global errors/rejections with removable listeners and hostile error getters",()=>{
    const target=new EventTarget(),stop=installDiagnosticHandlers(target),error=new Event("error");Object.defineProperty(error,"error",{value:new Error("PRIVATE_MESSAGE")});target.dispatchEvent(error);
    const rejection=new Event("unhandledrejection");Object.defineProperty(rejection,"reason",{value:{code:"auth/network-request-failed",message:"PRIVATE_EMAIL"}});target.dispatchEvent(rejection);expect(diagnosticSnapshot()).toHaveLength(2);stop();target.dispatchEvent(error);expect(diagnosticSnapshot()).toHaveLength(2);
    const hostile=Object.defineProperty({},"code",{get(){throw Error("SECRET");}});expect(()=>recordDiagnosticFailure(hostile)).not.toThrow();expect(JSON.stringify(diagnosticReport())).not.toContain("SECRET");
  });
});
