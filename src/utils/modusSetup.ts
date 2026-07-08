import { defineCustomElements } from '@trimble-oss/moduswebcomponents/loader';

let initialized = false;

export function setupModus(): void {
  if (initialized || typeof window === 'undefined') return;
  defineCustomElements();
  initialized = true;
}
