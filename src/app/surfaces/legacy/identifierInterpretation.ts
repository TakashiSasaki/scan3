export type LegacyIdentifierInterpretationMethod =
  | 'raw-text'
  | 'url-query-id'
  | 'url-path-last-segment'
  | 'historical-url-fallback';

export interface LegacyIdentifierInterpretation {
  rawValue: string;
  candidateValue: string;
  normalizedIdentifier: string;
  method: LegacyIdentifierInterpretationMethod;
  usable: boolean;
}

export function sanitizeLegacyItemId(value: string): string {
  return value.replace(/[^a-zA-Z0-9\-_.]/g, '');
}

export function interpretLegacyScannedIdentifier(
  rawValue: string
): LegacyIdentifierInterpretation {
  let candidateValue = rawValue;
  let method: LegacyIdentifierInterpretationMethod = 'raw-text';

  try {
    const url = new URL(rawValue);
    if (url.searchParams.has('id')) {
      const idParam = url.searchParams.get('id');
      if (idParam) {
        candidateValue = idParam;
        method = 'url-query-id';
      } else {
        candidateValue = rawValue;
        method = 'historical-url-fallback';
      }
    } else {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        candidateValue = parts[parts.length - 1];
        method = 'url-path-last-segment';
      } else {
        candidateValue = rawValue;
        method = 'historical-url-fallback';
      }
    }
  } catch (e) {
    candidateValue = rawValue;
    method = 'raw-text';
  }

  const normalizedIdentifier = sanitizeLegacyItemId(candidateValue.toUpperCase());
  const usable = normalizedIdentifier.length > 0;

  return {
    rawValue,
    candidateValue,
    normalizedIdentifier,
    method,
    usable,
  };
}
