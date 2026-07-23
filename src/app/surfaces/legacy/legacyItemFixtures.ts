import { LegacyItemLookupProvider, LegacyItemLookupResult } from './legacyItemLookup';
import { LegacyItemRecord } from './legacyItemModel';

const DEMO_ITEM_001: LegacyItemRecord = {
  id: 'DEMO-ITEM-001',
  ownerId: 'FIXTURE-OWNER-01',
  name: 'Development Fixture Item',
  description: 'This is a locally provided fixture for development without production database access.',
  contextImageUrls: [],
  bluetoothTags: [],
  tagType: 'qr',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export function createFixtureLegacyItemLookupProvider(): LegacyItemLookupProvider {
  return {
    async lookup(identifier, options): Promise<LegacyItemLookupResult> {
      // simulate minimal latency
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (options.signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      if (identifier === 'DEMO-ITEM-001') {
        return {
          state: 'found',
          item: DEMO_ITEM_001,
          source: 'local-development-fixture'
        };
      }

      return { state: 'not-found' };
    }
  };
}
