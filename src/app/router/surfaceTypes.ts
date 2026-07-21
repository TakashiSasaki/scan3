export type SurfaceStatus =
  | 'foundation'
  | 'planning'
  | 'awaiting-source'
  | 'placeholder'
  | 'draft'
  | 'awaiting-restoration';

export interface SurfaceDefinition {
  id: string;
  path: string;
  label: string;
  description: string;
  status: SurfaceStatus;
  shortcutVisible: boolean;
}
