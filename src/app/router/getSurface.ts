import catalogJson from './surfaceCatalog.json';
import { SurfaceDefinition } from './surfaceTypes';

const catalog = catalogJson as SurfaceDefinition[];

export function getSurfaceById(id: string): SurfaceDefinition {
  const entry = catalog.find(e => e.id === id);
  if (!entry) throw new Error(`Surface id not found in catalog: ${id}`);
  return entry;
}

export function getSurfaceByPath(path: string): SurfaceDefinition {
  const entry = catalog.find(e => e.path === path);
  if (!entry) throw new Error(`Surface path not found in catalog: ${path}`);
  return entry;
}
