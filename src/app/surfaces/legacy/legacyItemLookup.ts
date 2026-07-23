import { LegacyItemRecord } from './legacyItemModel';

export type LegacyItemLookupResult = 
  | { state: 'found'; item: LegacyItemRecord; source: string }
  | { state: 'not-found' }
  | { state: 'unconfigured' }
  | { state: 'error'; message: string };

export interface LegacyItemLookupProvider {
  lookup(identifier: string, options: { signal: AbortSignal }): Promise<LegacyItemLookupResult>;
}

export function createUnconfiguredLegacyItemLookupProvider(): LegacyItemLookupProvider {
  return {
    async lookup(identifier, options) {
      return { state: 'unconfigured' };
    }
  };
}
