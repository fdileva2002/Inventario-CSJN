import { useEffect, useState } from 'react';
import {
  Box,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import { api } from '../api/axios';

type DeviceMovement = {
  id: number;
  type: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  previousLocation?: string | null;
  newLocation?: string | null;
  detail?: string | null;
  date: string;
  person?: { fullName: string } | null;
  department?: { name: string } | null;
  user?: { name: string } | null;
};

type AuditEntry = {
  id: number;
  action: 'CREACION' | 'MODIFICACION' | 'ELIMINACION';
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changedFields: string[] | null;
  date: string;
  user?: { name: string } | null;
};

const movementTypeLabels: Record<string, string> = {
  ALTA_MANUAL: 'Alta manual',
  INGRESO_POR_COMPRA: 'Ingreso por compra',
  CAMBIO_ESTADO: 'Cambio de estado',
  ASIGNACION: 'Asignación',
  DEVOLUCION: 'Devolución',
  REPARACION: 'Reparación',
  BAJA: 'Baja',
  ACTUALIZACION: 'Actualización',
};

const statusLabels: Record<string, string> = {
  A_CONFIGURAR: 'A configurar',
  DISPONIBLE: 'Disponible',
  EN_FUNCIONAMIENTO: 'En funcionamiento',
  EN_REPARACION: 'En reparación',
  EN_BAJA: 'En baja',
};

const fieldLabels: Record<string, string> = {
  tag: 'Tag',
  serialNumber: 'N° de serie',
  hostname: 'Hostname',
  location: 'Ubicación',
  notes: 'Notas',
  statusId: 'Estado (id)',
  modelId: 'Modelo (id)',
  categoryId: 'Categoría (id)',
  supplierId: 'Proveedor (id)',
  purchaseOrderId: 'Orden de compra (id)',
  purchaseDate: 'Fecha de compra',
  entryDate: 'Fecha de ingreso',
};

const actionLabels: Record<AuditEntry['action'], string> = {
  CREACION: 'Creación',
  MODIFICACION: 'Modificación',
  ELIMINACION: 'Eliminación',
};

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleDateString();
  }
  return String(value);
}

function assigneeOf(movement: DeviceMovement) {
  return movement.person?.fullName || movement.department?.name || '-';
}

function statusChange(movement: DeviceMovement) {
  if (!movement.previousStatus && !movement.newStatus) return '-';
  const from = movement.previousStatus ? statusLabels[movement.previousStatus] ?? movement.previousStatus : '—';
  const to = movement.newStatus ? statusLabels[movement.newStatus] ?? movement.newStatus : '—';
  return `${from} → ${to}`;
}

function locationChange(movement: DeviceMovement) {
  if (!movement.previousLocation && !movement.newLocation) return '-';
  return `${movement.previousLocation || '—'} → ${movement.newLocation || '—'}`;
}

export default function DeviceHistory({ deviceId }: { deviceId: number }) {
  const [tab, setTab] = useState(0);
  const [movements, setMovements] = useState<DeviceMovement[]>([]);
  const [changes, setChanges] = useState<AuditEntry[]>([]);

  useEffect(() => {
    setTab(0);
    setMovements([]);
    setChanges([]);

    api.get(`/devices/${deviceId}/movements`).then((response) => setMovements(response.data));
    api
      .get('/audit', { params: { entity: 'Device', entityId: deviceId, limit: 200 } })
      .then((response) => setChanges(response.data.data));
  }, [deviceId]);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 1 }}>
        <Tab label={`Movimientos (${movements.length})`} />
        <Tab label={`Cambios de datos (${changes.length})`} />
      </Tabs>

      <Box sx={{ overflowX: 'auto' }}>
        {tab === 0 && (
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Asignado a</TableCell>
                <TableCell>Ubicación</TableCell>
                <TableCell>Detalle</TableCell>
                <TableCell>Usuario</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {new Date(movement.date).toLocaleString()}
                  </TableCell>
                  <TableCell>{movementTypeLabels[movement.type] ?? movement.type}</TableCell>
                  <TableCell>{statusChange(movement)}</TableCell>
                  <TableCell>{assigneeOf(movement)}</TableCell>
                  <TableCell>{locationChange(movement)}</TableCell>
                  <TableCell>{movement.detail || '-'}</TableCell>
                  <TableCell>{movement.user?.name || '-'}</TableCell>
                </TableRow>
              ))}

              {movements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Sin movimientos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        {tab === 1 && (
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Acción</TableCell>
                <TableCell>Campo</TableCell>
                <TableCell>Antes</TableCell>
                <TableCell>Después</TableCell>
                <TableCell>Usuario</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {changes.flatMap((entry) => {
                const fields =
                  entry.action === 'MODIFICACION' ? entry.changedFields ?? [] : [null];

                return fields.map((field, index) => (
                  <TableRow key={`${entry.id}-${field ?? 'row'}`}>
                    {index === 0 ? (
                      <>
                        <TableCell rowSpan={fields.length} sx={{ whiteSpace: 'nowrap' }}>
                          {new Date(entry.date).toLocaleString()}
                        </TableCell>
                        <TableCell rowSpan={fields.length}>{actionLabels[entry.action]}</TableCell>
                      </>
                    ) : null}
                    {field ? (
                      <>
                        <TableCell>{fieldLabels[field] ?? field}</TableCell>
                        <TableCell>{formatValue(entry.previousValues?.[field])}</TableCell>
                        <TableCell>{formatValue(entry.newValues?.[field])}</TableCell>
                      </>
                    ) : (
                      <TableCell colSpan={3}>
                        <Typography variant="body2" color="text.secondary">
                          {entry.action === 'CREACION' ? 'Registro creado' : 'Registro eliminado'}
                        </Typography>
                      </TableCell>
                    )}
                    {index === 0 ? (
                      <TableCell rowSpan={fields.length}>{entry.user?.name || '-'}</TableCell>
                    ) : null}
                  </TableRow>
                ));
              })}

              {changes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Sin cambios registrados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Box>
    </Box>
  );
}
