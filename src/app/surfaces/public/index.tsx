import DevelopmentShortcuts from '../../components/DevelopmentShortcuts';
import { SurfacePlaceholder } from '../../components/SurfacePlaceholder';
import { getSurfaceById } from '../../router/getSurface';

export function PublicSurface() {
  const surface = getSurfaceById('public');
  return (
    <div className="public-surface-container">
      <SurfacePlaceholder
        title={surface.label}
        status={surface.status}
        description={surface.description}
      />
      <DevelopmentShortcuts />
    </div>
  );
}
