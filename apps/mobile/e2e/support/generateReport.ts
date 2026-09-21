/**
 * Reads e2e/report/findings.ndjson (written incrementally during the run by
 * recordFinding()) and e2e/report/results.json (Playwright's own JSON
 * reporter output) and produces the human-readable summary the task asked
 * for. Run with: npx tsx e2e/support/generateReport.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Finding, Severity } from "./findings";

const REPORT_DIR = path.join(__dirname, "..", "report");
const FINDINGS_PATH = path.join(REPORT_DIR, "findings.ndjson");
const RESULTS_PATH = path.join(REPORT_DIR, "results.json");

interface PlaywrightResults {
  suites: unknown[];
  stats: { expected: number; unexpected: number; skipped: number; flaky: number };
}

function loadFindings(): Finding[] {
  if (!existsSync(FINDINGS_PATH)) return [];
  return readFileSync(FINDINGS_PATH, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Finding);
}

function loadResults(): PlaywrightResults | null {
  if (!existsSync(RESULTS_PATH)) return null;
  return JSON.parse(readFileSync(RESULTS_PATH, "utf8"));
}

function countSpecs(suites: unknown[]): { total: number; passed: number; failed: number } {
  let total = 0;
  let passed = 0;
  let failed = 0;
  function walk(suite: any) {
    for (const spec of suite.specs ?? []) {
      total++;
      const ok = spec.tests?.every((t: any) => t.results?.every((r: any) => r.status === "passed"));
      if (ok) passed++;
      else failed++;
    }
    for (const child of suite.suites ?? []) walk(child);
  }
  for (const s of suites) walk(s);
  return { total, passed, failed };
}

const findings = loadFindings();
const results = loadResults();
const bySeverity = (sev: Severity) => findings.filter((f) => f.severity === sev);

const specCounts = results ? countSpecs(results.suites) : { total: 0, passed: 0, failed: 0 };

const lines: string[] = [];
lines.push("# Silver Fox — Flow Agent Report");
lines.push("");
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push(`- Total test cases executed: ${specCounts.total}`);
lines.push(`- Passed: ${specCounts.passed}`);
lines.push(`- Failed: ${specCounts.failed}`);
lines.push(`- Blocked (setup/infrastructure failures, not app defects): see notes in each spec file`);
lines.push(`- Findings recorded: ${findings.length}`);
lines.push(`  - CRITICAL: ${bySeverity("CRITICAL").length}`);
lines.push(`  - HIGH: ${bySeverity("HIGH").length}`);
lines.push(`  - MEDIUM: ${bySeverity("MEDIUM").length}`);
lines.push(`  - LOW: ${bySeverity("LOW").length}`);
lines.push("");

for (const severity of ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as Severity[]) {
  const items = bySeverity(severity);
  if (items.length === 0) continue;
  lines.push(`## ${severity} (${items.length})`);
  lines.push("");
  for (const f of items) {
    lines.push(`### ${f.journey}`);
    lines.push(`- **Screen**: ${f.screen}`);
    lines.push(`- **Action**: ${f.action}`);
    if (f.input !== undefined) lines.push(`- **Input**: ${JSON.stringify(f.input)}`);
    lines.push(`- **Expected**: ${f.expected}`);
    lines.push(`- **Actual**: ${f.actual}`);
    lines.push(`- **Repro**: ${f.reproSteps.map((s, i) => `${i + 1}. ${s}`).join(" ")}`);
    lines.push("");
  }
}

const outPath = path.join(REPORT_DIR, "REPORT.md");
writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`Wrote ${outPath}`);
console.log(`${findings.length} findings (${bySeverity("CRITICAL").length} critical, ${bySeverity("HIGH").length} high, ${bySeverity("MEDIUM").length} medium, ${bySeverity("LOW").length} low)`);
