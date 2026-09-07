export interface ReferencedSidecarReleaseMetadata {
  assets: ReadonlyArray<{ digest?: string; name: string }>;
  isDraft: boolean;
}

export function validateReferencedSidecarRelease(
  releaseMetadata: unknown,
  checksumsText: string,
): string[];

export function assertReferencedSidecarRelease(
  releaseMetadata: unknown,
  checksumsText: string,
): void;
