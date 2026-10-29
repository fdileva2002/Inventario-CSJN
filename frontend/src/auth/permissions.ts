import { getUser } from './auth.storage';

// Espejo de backend/src/auth/roles.ts: el backend es quien hace cumplir los permisos;
// esto solo decide qué botones mostrar.
export type Role = 'SUPERADMIN' | 'ADMINISTRADOR' | 'TECNICO' | 'CONSULTA';

export const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: 'Superadmin',
  ADMINISTRADOR: 'Administrador',
  TECNICO: 'Técnico',
  CONSULTA: 'Consulta',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPERADMIN: 'Todo: también borrar, ajustar stock y administrar usuarios',
  ADMINISTRADOR: 'Cargar y editar; no puede borrar ni ajustar stock',
  TECNICO: 'Asignar y devolver equipos, entregar consumibles, instalar componentes',
  CONSULTA: 'Solo puede ver',
};

export function getPermissions() {
  const role = getUser()?.role as Role | undefined;

  const canAssign = role === 'SUPERADMIN' || role === 'ADMINISTRADOR' || role === 'TECNICO';
  const canLoad = role === 'SUPERADMIN' || role === 'ADMINISTRADOR';
  const isSuperadmin = role === 'SUPERADMIN';

  return {
    role,
    canAssign,
    canLoad,
    canDelete: isSuperadmin,
    canAdjustStock: isSuperadmin,
    canManageUsers: isSuperadmin,
  };
}
