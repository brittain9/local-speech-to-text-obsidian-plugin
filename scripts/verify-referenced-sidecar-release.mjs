#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import process from 'node:process';

import { EXPECTED_SIDECAR_ARCHIVES } from './assemble-release-files.mjs';

const REQUIRED_RELEASE_ASSETS = Object.freeze(['checksums.txt', ...EXPECTED_SIDECAR_ARCHIVES]);
const SHA256_CHECKSUM_PATTERN = /^([0-9a-f]{64})\s+\*?(.+)$/i;

/**
 * Check whether a published GitHub Release can satisfy first-run sidecar
 * installation. The caller obtains the release metadata and checksums.txt from
 * GitHub; keeping validation here makes the release invariant testable.
 *
 * @param {unknown} releaseMetadata
 * @param {string} checksumsText
 * @returns {string[]} errors (empty when the release is installable)
 */
export function validateReferencedSidecarRelease(releaseMetadata, checksumsText) {
  const errors = [];
  const metadata = asRecord(releaseMetadata);
  if (metadata === null) {
    return ['release metadata must be an object.'];
  }
  if (metadata.isDraft !== false) {
    errors.push('release must be published, not a draft.');
  }

  const assets = Array.isArray(metadata.assets)
    ? metadata.assets.map(asRecord).filter((asset) => asset !== null)
    : [];
  for (const assetName of REQUIRED_RELEASE_ASSETS) {
    const occurrences = assets.filter((asset) => asset.name === assetName);
    if (occurrences.length === 0) {
      errors.push(`release is missing required asset: ${assetName}.`);
    } else if (occurrences.length > 1) {
      errors.push(`release has duplicate required asset: ${assetName}.`);
    }
  }

  const checksumsByFilename = new Map();
  for (const rawLine of checksumsText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0) continue;

    const match = line.match(SHA256_CHECKSUM_PATTERN);
    if (match === null) {
      errors.push(`checksums.txt has an invalid entry: ${line}.`);
      continue;
    }
    const [, digest, rawFilename] = match;
    if (digest === undefined || rawFilename === undefined) {
      errors.push(`checksums.txt has an invalid entry: ${line}.`);
      continue;
    }

    const filename = rawFilename.trim();
    const entries = checksumsByFilename.get(filename) ?? [];
    entries.push(digest);
    checksumsByFilename.set(filename, entries);
  }

  for (const archiveName of EXPECTED_SIDECAR_ARCHIVES) {
    const entries = checksumsByFilename.get(archiveName) ?? [];
    if (entries.length === 0) {
      errors.push(`checksums.txt is missing the SHA-256 for ${archiveName}.`);
    } else if (entries.length > 1) {
      errors.push(`checksums.txt has duplicate SHA-256 entries for ${archiveName}.`);
    }

    const releaseAsset = assets.find((asset) => asset.name === archiveName);
    const digest = typeof releaseAsset?.digest === 'string' ? releaseAsset.digest : null;
    const digestMatch = digest?.match(/^sha256:([0-9a-f]{64})$/i);
    if (digestMatch === null || digestMatch === undefined || digestMatch[1] === undefined) {
      errors.push(`release asset ${archiveName} is missing a SHA-256 digest.`);
      continue;
    }
    if (entries.length === 1 && entries[0]?.toLowerCase() !== digestMatch[1].toLowerCase()) {
      errors.push(`checksums.txt SHA-256 does not match the release asset: ${archiveName}.`);
    }
  }

  return errors;
}

export function assertReferencedSidecarRelease(releaseMetadata, checksumsText) {
  const errors = validateReferencedSidecarRelease(releaseMetadata, checksumsText);
  if (errors.length === 0) return;
  throw new Error(`Referenced sidecar release is not installable:\n- ${errors.join('\n- ')}`);
}

function asRecord(value) {
  return typeof value === 'object' && value !== null ? value : null;
}

function parseArgs(argv) {
  const options = { checksumsPath: null, metadataPath: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${argument} requires a value.`);
    }
    if (argument === '--checksums') options.checksumsPath = value;
    else if (argument === '--metadata') options.metadataPath = value;
    else throw new Error(`Unknown argument: ${argument}`);
    index += 1;
  }
  if (options.checksumsPath === null || options.metadataPath === null) {
    throw new Error(
      'Usage: node scripts/verify-referenced-sidecar-release.mjs --metadata <path> --checksums <path>',
    );
  }
  return options;
}

if (process.argv[1] !== undefined && import.meta.url.endsWith(process.argv[1])) {
  const options = parseArgs(process.argv.slice(2));
  const [metadataText, checksumsText] = await Promise.all([
    readFile(options.metadataPath, 'utf8'),
    readFile(options.checksumsPath, 'utf8'),
  ]);
  assertReferencedSidecarRelease(JSON.parse(metadataText), checksumsText);
  console.log('Referenced sidecar release is published and installable.');
}
