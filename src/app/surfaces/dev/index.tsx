import { SurfacePlaceholder } from '../../components/SurfacePlaceholder';
import { getSurfaceById } from '../../router/getSurface';

export function DevSurface() {
  const surface = getSurfaceById('dev');
  return (
    <SurfacePlaceholder
      title={surface.label}
      status={surface.status}
      description={surface.description}
    />
  );
}
