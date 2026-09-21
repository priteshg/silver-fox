import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface Finding {
  journey: string;
  screen: string;
  action: string;
  input?: string;
  expected: string;
  actual: string;
  severity: Severity;
  screenshotPath?: string;
  consoleError?: string;
  networkError?: string;
  reproSteps: string[];
}

const FINDINGS_FILE = path.join(__dirname, "..", "report", "findings.ndjson");

/**
 * Appends one finding as a line of newline-delimited JSON immediately, so
 * findings survive even if a later test in the run crashes the process —
 * the final report is assembled by reading this file back, not by holding
 * findings in memory for the whole suite.
 */
export function recordFinding(finding: Finding): void {
  const dir = path.dirname(FINDINGS_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(FINDINGS_FILE, JSON.stringify(finding) + "\n", "utf8");
}

export function resetFindingsFile(): void {
  const dir = path.dirname(FINDINGS_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(FINDINGS_FILE, "", "utf8");
}

export function findingsFilePath(): string {
  return FINDINGS_FILE;
}
