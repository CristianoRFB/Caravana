import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const gaxiosRequire = createRequire(require.resolve("gaxios"));
type Options = { headers: Record<string, string>; body: AsyncIterable<Uint8Array>; url: string };
type Client = { request: (options: Record<string, unknown>) => Promise<{ data: unknown }> };
const { Gaxios } = require("gaxios") as { Gaxios: new (defaults: Record<string, unknown>) => Client };
const response = (options: Options, data: unknown) => ({ data, config: options, status: 200, statusText: "OK", headers: {}, request: { responseURL: options.url } });

describe("scoped UUID remediation preserves the actual CLI HTTP consumers without network", () => {
  it("loads the patched CJS UUID through Gaxios and preserves valid unique v4 identifiers", () => {
    expect(gaxiosRequire("uuid/package.json").version).toBe("11.1.1");
    const uuid = gaxiosRequire("uuid") as { v4: () => string; validate: (value: string) => boolean; version: (value: string) => number };
    const values = Array.from({ length: 32 }, () => uuid.v4());
    expect(new Set(values).size).toBe(values.length);
    for (const value of values) { expect(uuid.validate(value)).toBe(true); expect(uuid.version(value)).toBe(4); }
  });
  it("encodes multipart headers, boundaries and complete bytes using the real Gaxios stream", async () => {
    let calls = 0;
    const client = new Gaxios({ adapter: async (options: Options) => {
      calls++;
      const boundary = options.headers["Content-Type"].match(/^multipart\/related; boundary=([a-f0-9-]+)$/)?.[1];
      expect(boundary).toMatch(/^[a-f0-9-]{36}$/);
      const chunks = [];
      for await (const chunk of options.body) chunks.push(Buffer.from(chunk));
      const body = Buffer.concat(chunks).toString();
      expect(body).toContain(`--${boundary}\r\n`);
      expect(body).toContain("SYNTHETIC FIRST PART");
      expect(body).toContain("SYNTHETIC SECOND PART");
      expect(body.trimEnd()).toMatch(new RegExp(`--${boundary}--$`));
      return response(options, "multipart-ok");
    } });
    const result = await client.request({ url: "https://example.invalid/no-network", method: "POST", multipart: [
      { headers: { "Content-Type": "text/plain" }, content: "SYNTHETIC FIRST PART" },
      { headers: { "Content-Type": "text/plain" }, content: "SYNTHETIC SECOND PART" },
    ] });
    expect(result.data).toBe("multipart-ok"); expect(calls).toBe(1);
  });
  it("keeps the CLI Google Auth transport compatible without refreshing or exporting credentials", async () => {
    const cliRequire = createRequire(require.resolve("firebase-tools/package.json"));
    type AuthClient = { transporter: Client; setCredentials: (tokens: Record<string, unknown>) => void; request: Client["request"] };
    const { OAuth2Client } = cliRequire("google-auth-library") as { OAuth2Client: new () => AuthClient };
    const auth = new OAuth2Client();
    auth.setCredentials({ access_token: "SYNTHETIC_LOCAL_ONLY", expiry_date: Date.now() + 3600000 });
    let calls = 0;
    auth.transporter = new Gaxios({ adapter: async (options: Options) => {
      calls++; expect(options.headers.Authorization).toBe("Bearer SYNTHETIC_LOCAL_ONLY");
      return response(options, { synthetic: true });
    } });
    expect((await auth.request({ url: "https://example.invalid/no-network" })).data).toEqual({ synthetic: true });
    expect(calls).toBe(1);
  });
});
