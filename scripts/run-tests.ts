#!/usr/bin/env bun
/* eslint-disable no-await-in-loop */
/**
 * Runner de tests para Bako.
 *
 * `bun test` aplica `mock.module()` a nivel global cuando varios specs corren
 * en el mismo proceso. Eso contamina los mocks entre archivos y genera falsos
 * negativos. Para mantener el aislamiento que daba Vitest, este script ejecuta
 * cada spec en su propio proceso (`bun test <file>`), secuencialmente, y
 * agrega un resumen final.
 */
import { spawn } from "bun";

const DEFAULT_PATTERNS = [
  "src/**/*.spec.ts",
  "src/**/*.dom.spec.tsx",
  "scripts/**/*.spec.ts",
];

const args = process.argv.slice(2);
const patterns = args.length > 0 ? args : DEFAULT_PATTERNS;

async function findSpecs(globPatterns: string[]): Promise<string[]> {
  const files = new Set<string>();
  for (const pattern of globPatterns) {
    const glob = new Bun.Glob(pattern);
    for await (const file of glob.scan(".")) {
      files.add(file);
    }
  }
  return Array.from(files).sort();
}

async function runSpec(file: string): Promise<{ ok: boolean; output: string }> {
  const proc = spawn(["bun", "test", file], {
    stdout: "pipe",
    stderr: "pipe",
    cwd: process.cwd(),
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { ok: exitCode === 0, output: stdout + stderr };
}

async function main() {
  const specs = await findSpecs(patterns);
  if (specs.length === 0) {
    console.log("No specs found.");
    process.exit(0);
  }

  console.log(`Running ${specs.length} spec(s) sequentially...\n`);

  let passed = 0;
  let failed = 0;
  const failures: { file: string; output: string }[] = [];

  for (const file of specs) {
    const { ok, output } = await runSpec(file);
    if (ok) {
      passed++;
      console.log(`✓ ${file}`);
    } else {
      failed++;
      failures.push({ file, output });
      console.log(`✗ ${file}`);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed, ${specs.length} total`);

  if (failures.length > 0) {
    for (const { file, output } of failures) {
      console.log(`\n--- ${file} ---\n${output}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
