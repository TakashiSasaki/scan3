export interface LegacyNfcReadingEvent extends Event {
  serialNumber: string;
}

export interface LegacyNdefReader {
  onreading: ((event: LegacyNfcReadingEvent) => void) | null;
  onreadingerror: ((event: Event) => void) | null;
  scan(options?: { signal?: AbortSignal }): Promise<void>;
}

export type LegacyNdefReaderConstructor = new () => LegacyNdefReader;

export function getLegacyNdefReaderConstructor(): LegacyNdefReaderConstructor | null {
  if ('NDEFReader' in globalThis) {
    const constructor = (globalThis as unknown as { NDEFReader: LegacyNdefReaderConstructor }).NDEFReader;
    if (typeof constructor === 'function') {
      return constructor;
    }
  }
  return null;
}
