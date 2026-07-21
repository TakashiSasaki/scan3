import { SurfacePlaceholder } from '../../components/SurfacePlaceholder';
import { getSurfaceById } from '../../router/getSurface';

export function AdminSurface() {
  const surface = getSurfaceById('admin');
  return (
    <SurfacePlaceholder
      title={surface.label}
      status={surface.status}
      description={surface.description}
    />
  );
}
