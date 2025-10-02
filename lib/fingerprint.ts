'use client';

import FingerprintJS from '@fingerprintjs/fingerprintjs';
import type { Agent } from '@fingerprintjs/fingerprintjs';

let fpPromise: Promise<Agent> | null = null;

export async function getFingerprint(): Promise<string> {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load();
  }

  const fp = await fpPromise;
  const result = await fp.get();

  return result.visitorId;
}
