import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

// Offline synthetic JSON only. This program has no Firebase SDK, credentials, network client or write operation.
const source = (name) => fs.readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), "utf8");
const moduleUrl = (text) => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText).toString("base64")}`;
try {
  if (process.argv.length !== 3) throw new Error("Use npm run finance:diagnose -- <arquivo-sintetico.json>");
  const inputPath = path.resolve(process.argv[2]);
  if (!inputPath.endsWith(".synthetic.json") || fs.statSync(inputPath).size > 5_000_000) throw new Error("Apenas arquivo .synthetic.json de até5MB é aceito.");
  const dataset = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  if (dataset.environment !== "synthetic" || ![dataset.registrations, dataset.payments, dataset.expenses].every(Array.isArray)) throw new Error("Dataset sintético inválido.");
  const financeUrl = moduleUrl(source("finance"));
  const { diagnoseFinancialLedger, redactedFinanceCsv } = await import(moduleUrl(source("financial-diagnostics").replace('"./finance"', JSON.stringify(financeUrl))));
  const findings = diagnoseFinancialLedger(dataset.registrations, dataset.payments);
  const counts = Object.fromEntries(["unitemized_total", "ledger_exceeds_total", "invalid_amount", "foreign_entry"].map((kind) => [kind, findings.filter((item) => item.kind === kind).length]));
  process.stdout.write(JSON.stringify({ environment: "synthetic", readOnly: true, counts, redactedSummaryCsv: redactedFinanceCsv(dataset.registrations, dataset.expenses) }, null, 2) + "\n");
} catch {
  // Do not echo source JSON, paths containing identities, or SDK diagnostics to reports.
  process.stderr.write("Diagnóstico não executado: informe um dataset local .synthetic.json válido, até5MB, environment=synthetic e arrays registrations/payments/expenses. Nenhum dado foi alterado.\n");
  process.exitCode = 1;
}
