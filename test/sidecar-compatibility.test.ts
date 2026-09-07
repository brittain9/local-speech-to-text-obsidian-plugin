import { describe, expect, it } from 'vitest';

import {
  assertSidecarCompatibility,
  selectSidecarCompatibilityChanges,
} from '../scripts/verify-sidecar-compatibility.mjs';

describe('sidecar compatibility boundary', () => {
  it('allows a plugin-only release for changes outside the sidecar boundary', () => {
    const changedPaths = ['docs/guides/linux-support.md', 'src/translation/translation-modal.ts'];

    expect(selectSidecarCompatibilityChanges(changedPaths)).toEqual([]);
    expect(() => assertSidecarCompatibility(changedPaths, '2026.8.7')).not.toThrow();
  });

  it('requires a sidecar release for native and wire-protocol client changes', () => {
    const changedPaths = [
      'native/src/protocol.rs',
      'src/sidecar/protocol.ts',
      'src/sidecar/sidecar-installer.ts',
      'src/tts/read-aloud-controller.ts',
    ];

    expect(selectSidecarCompatibilityChanges(changedPaths)).toEqual(changedPaths);
    expect(() => assertSidecarCompatibility(changedPaths, '2026.8.7')).toThrow(
      /Prepare the release with --sidecar/,
    );
  });
});
