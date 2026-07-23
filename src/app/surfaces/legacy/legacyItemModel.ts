export type LegacyItemTagType = 'qr' | 'nfc' | 'none';

export interface LegacyItemRecord {
  id: string;
  ownerId: string;
  name?: string;
  description?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  mainImageUrl?: string;
  contextImageUrls: string[];
  bluetoothTags: Array<{
    id: string;
    name: string;
    rssi?: number;
    linkedAt?: string;
  }>;
  tagType?: LegacyItemTagType;
  createdAt: string;
  updatedAt: string;
}

function isString(val: unknown): val is string {
  return typeof val === 'string';
}

function isNumber(val: unknown): val is number {
  return typeof val === 'number';
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function parseLegacyItemRecord(value: unknown): 
  | { ok: true; item: LegacyItemRecord }
  | { ok: false; issues: string[] } {
  const issues: string[] = [];

  if (!isObject(value)) {
    return { ok: false, issues: ['Root value is not an object.'] };
  }

  const {
    id,
    ownerId,
    name,
    description,
    location,
    mainImageUrl,
    contextImageUrls,
    bluetoothTags,
    tagType,
    createdAt,
    updatedAt
  } = value;

  if (!isString(id)) issues.push('Missing or invalid "id".');
  if (!isString(ownerId)) issues.push('Missing or invalid "ownerId".');
  if (!isString(createdAt)) issues.push('Missing or invalid "createdAt".');
  if (!isString(updatedAt)) issues.push('Missing or invalid "updatedAt".');

  if (name !== undefined && !isString(name)) issues.push('Invalid "name".');
  if (description !== undefined && !isString(description)) issues.push('Invalid "description".');
  
  if (location !== undefined) {
    if (!isObject(location)) {
      issues.push('Invalid "location", expected object.');
    } else {
      if (!isNumber(location.latitude)) issues.push('Invalid "location.latitude".');
      if (!isNumber(location.longitude)) issues.push('Invalid "location.longitude".');
      if (location.address !== undefined && !isString(location.address)) {
        issues.push('Invalid "location.address".');
      }
    }
  }

  if (mainImageUrl !== undefined && !isString(mainImageUrl)) issues.push('Invalid "mainImageUrl".');

  let parsedContextImageUrls: string[] = [];
  if (contextImageUrls === undefined) {
    // missing -> empty array
  } else if (!Array.isArray(contextImageUrls)) {
    issues.push('Invalid "contextImageUrls", expected array.');
  } else {
    for (const url of contextImageUrls) {
      if (!isString(url)) {
        issues.push('Invalid element in "contextImageUrls", expected string.');
        break;
      }
    }
    parsedContextImageUrls = contextImageUrls as string[];
  }

  let parsedBluetoothTags: LegacyItemRecord['bluetoothTags'] = [];
  if (bluetoothTags === undefined) {
    // missing -> empty array
  } else if (!Array.isArray(bluetoothTags)) {
    issues.push('Invalid "bluetoothTags", expected array.');
  } else {
    for (const tag of bluetoothTags) {
      if (!isObject(tag)) {
        issues.push('Invalid element in "bluetoothTags", expected object.');
        break;
      }
      if (!isString(tag.id)) issues.push('Invalid "bluetoothTags[].id".');
      if (!isString(tag.name)) issues.push('Invalid "bluetoothTags[].name".');
      if (tag.rssi !== undefined && !isNumber(tag.rssi)) issues.push('Invalid "bluetoothTags[].rssi".');
      if (tag.linkedAt !== undefined && !isString(tag.linkedAt)) issues.push('Invalid "bluetoothTags[].linkedAt".');
    }
    parsedBluetoothTags = bluetoothTags as LegacyItemRecord['bluetoothTags'];
  }

  if (tagType !== undefined) {
    if (tagType !== 'qr' && tagType !== 'nfc' && tagType !== 'none') {
      issues.push('Invalid "tagType", expected "qr", "nfc", or "none".');
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    item: {
      id: id as string,
      ownerId: ownerId as string,
      name: name as string | undefined,
      description: description as string | undefined,
      location: location as LegacyItemRecord['location'],
      mainImageUrl: mainImageUrl as string | undefined,
      contextImageUrls: parsedContextImageUrls,
      bluetoothTags: parsedBluetoothTags,
      tagType: tagType as LegacyItemTagType | undefined,
      createdAt: createdAt as string,
      updatedAt: updatedAt as string,
    }
  };
}
