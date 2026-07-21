import { SurfacePlaceholder } from '../../components/SurfacePlaceholder';
import { getSurfaceById } from '../../router/getSurface';

export function ApiSurface() {
  const surface = getSurfaceById('api');
  return (
    <SurfacePlaceholder
      title={surface.label}
      status={surface.status}
      description={surface.description}
    />
  );
}
