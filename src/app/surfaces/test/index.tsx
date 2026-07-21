import { SurfacePlaceholder } from '../../components/SurfacePlaceholder';
import { getSurfaceById } from '../../router/getSurface';

export function TestSurface() {
  const surface = getSurfaceById('test');
  return (
    <SurfacePlaceholder
      title={surface.label}
      status={surface.status}
      description={surface.description}
    />
  );
}
