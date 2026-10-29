import { UserRole } from '@prisma/client';

// Grupos de permisos. Cada endpoint declara uno con @Roles(...GRUPO).
//
//                 Superadmin  Administrador  Técnico  Consulta
//   LECTURA           ✔             ✔            ✔        ✔     ver todo
//   ASIGNACION        ✔             ✔            ✔              asignar/devolver equipos, entregar consumibles,
//                                                               editar hostname/ubicación/notas
//   CARGA             ✔             ✔                           altas y ediciones, cambios de estado
//   TOTAL             ✔                                         borrar, ajustar stock, usuarios

export const LECTURA: UserRole[] = ['SUPERADMIN', 'ADMINISTRADOR', 'TECNICO', 'CONSULTA'];
export const ASIGNACION: UserRole[] = ['SUPERADMIN', 'ADMINISTRADOR', 'TECNICO'];
export const CARGA: UserRole[] = ['SUPERADMIN', 'ADMINISTRADOR'];
export const TOTAL: UserRole[] = ['SUPERADMIN'];
