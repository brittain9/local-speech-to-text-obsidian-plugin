export const SIDECAR_COMPATIBILITY_PATHS: readonly string[];

export function selectSidecarCompatibilityChanges(changedPaths: readonly string[]): string[];

export function listSidecarCompatibilityChanges(options: {
  baseRef: string;
  cwd?: string;
  headRef?: string;
}): string[];

export function assertSidecarCompatibility(
  changedPaths: readonly string[],
  sidecarVersion: string,
): void;
