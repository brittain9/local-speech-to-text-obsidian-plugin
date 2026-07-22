#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import process from 'node:process';

// A change in any of these inputs can make an existing sidecar incompatible.
// Keep the list narrow enough for ordinary plugin-only releases, but include
// every TypeScript module that sends commands or parses events on the native
// wire protocol. The ADR records the policy and release workflow enforces it.
export const SIDECAR_COMPATIBILITY_PATHS = Object.freeze([
  'native',
  'src/dictation/dictation-session-controller.ts',
  'src/models/model-install-manager.ts',
  'src/sidecar/protocol.ts',
  'src/sidecar/sidecar-connection.ts',
  'src/sidecar/sidecar-executable.ts',
  'src/sidecar/sidecar-installer.ts',
  'src/sidecar/sidecar-paths.ts',
  'src/translation/hy-mt-client.ts',
  'src/translation/translation-controller.ts',
  'src/tts/read-aloud-controller.ts',
]);

export function selectSidecarCompatibilityChanges(changedPaths) {
  return changedPaths.filter((path) =>
    SIDECAR_COMPATIBILITY_PATHS.some(
      (compatibilityPath) => path === compatibilityPath || path.startsWith(`${compatibilityPath}/`),
    ),
  );
}

export function listSidecarCompatibilityChanges({ baseRef, cwd = '.', headRef = 'HEAD' }) {
  const output = execFileSync(
    'git',
    ['diff', '--name-only', '--diff-filter=ACDMRT', `${baseRef}...${headRef}`, '--'],
    { cwd, encoding: 'utf8' },
  );
  return selectSidecarCompatibilityChanges(output.split('\n').filter(Boolean));
}

export function assertSidecarCompatibility(changedPaths, sidecarVersion) {
  const compatibilityChanges = selectSidecarCompatibilityChanges(changedPaths);
  if (compatibilityChanges.length === 0) return;

  throw new Error(
    `Plugin-only release cannot reuse sidecar ${sidecarVersion}; sidecar compatibility inputs changed:\n${compatibilityChanges
      .map((path) => `- ${path}`)
      .join('\n')}\nPrepare the release with --sidecar.`,
  );
}

function parseArgs(argv) {
  if (argv.length !== 2 || argv[0] !== '--base' || argv[1] === undefined) {
    throw new Error('Usage: node scripts/verify-sidecar-compatibility.mjs --base <sidecar-tag>');
  }
  return { baseRef: argv[1] };
}

if (process.argv[1] !== undefined && import.meta.url.endsWith(process.argv[1])) {
  const { baseRef } = parseArgs(process.argv.slice(2));
  assertSidecarCompatibility(listSidecarCompatibilityChanges({ baseRef }), baseRef);
  console.log(`No sidecar compatibility inputs changed since ${baseRef}.`);
}
