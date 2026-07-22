import { describe, expect, it } from 'vitest';

import { EXPECTED_SIDECAR_ARCHIVES } from '../scripts/assemble-release-files.mjs';
import { validateReferencedSidecarRelease } from '../scripts/verify-referenced-sidecar-release.mjs';

describe('referenced sidecar release validation', () => {
  const expectedArchives = EXPECTED_SIDECAR_ARCHIVES.map((name, index) => ({
    digest: String(index).repeat(64),
    name,
  }));
  const checksums = expectedArchives.map(({ digest, name }) => `${digest}  ${name}`).join('\n');
  const releaseMetadata = {
    assets: [
      { name: 'checksums.txt' },
      ...expectedArchives.map(({ digest, name }) => ({ digest: `sha256:${digest}`, name })),
    ],
    isDraft: false,
  };

  it('accepts a published release with all archives and valid checksums', () => {
    expect(validateReferencedSidecarRelease(releaseMetadata, checksums)).toEqual([]);
  });

  it('rejects a draft release even when it has all required assets', () => {
    expect(
      validateReferencedSidecarRelease({ ...releaseMetadata, isDraft: true }, checksums),
    ).toContain('release must be published, not a draft.');
  });

  it('rejects missing archives and incomplete checksum manifests', () => {
    const errors = validateReferencedSidecarRelease(
      {
        ...releaseMetadata,
        assets: releaseMetadata.assets.filter((asset) => asset.name !== 'checksums.txt'),
      },
      checksums.split('\n').slice(1).join('\n'),
    );

    expect(errors).toContain('release is missing required asset: checksums.txt.');
    expect(errors).toContain(
      `checksums.txt is missing the SHA-256 for ${EXPECTED_SIDECAR_ARCHIVES[0]}.`,
    );
  });

  it('rejects a checksum that differs from the published archive digest', () => {
    const errors = validateReferencedSidecarRelease(
      {
        ...releaseMetadata,
        assets: releaseMetadata.assets.map((asset) =>
          asset.name === EXPECTED_SIDECAR_ARCHIVES[0]
            ? { ...asset, digest: `sha256:${'f'.repeat(64)}` }
            : asset,
        ),
      },
      checksums,
    );

    expect(errors).toContain(
      `checksums.txt SHA-256 does not match the release asset: ${EXPECTED_SIDECAR_ARCHIVES[0]}.`,
    );
  });

  it("rejects an archive without GitHub's published digest", () => {
    const errors = validateReferencedSidecarRelease(
      {
        ...releaseMetadata,
        assets: releaseMetadata.assets.map((asset) =>
          asset.name === EXPECTED_SIDECAR_ARCHIVES[0] ? { name: asset.name } : asset,
        ),
      },
      checksums,
    );

    expect(errors).toContain(
      `release asset ${EXPECTED_SIDECAR_ARCHIVES[0]} is missing a SHA-256 digest.`,
    );
  });
});
