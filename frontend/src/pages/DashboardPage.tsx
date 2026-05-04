import { useEffect, useState } from 'react';
import {  Box, 
          Paper,
          Typography,
          Table,
          TableBody,
          TableCell,
          TableHead,
          TableRow, 
        } from '@mui/material';
import { api } from '../api/axios';
import AppLayout from '../components/AppLayout';
import { getUser } from '../auth/auth.storage';

type DashboardDeviceAlert = {
  id: number;
  tag: string;
  hostname?: string | null;
  serialNumber: string;
  category: string;
  model: string;
  status: string;
};

type DashboardConsumableAlert = {
  id: number;
  name: string;
  brand?: string | null;
  model: string;
  variant?: string | null;
  currentStock: number;
  minimumStock: number;
  unitMeasure?: string | null;
};

type DashboardSummary = {
    devicesToConfigure: number;
    lowStockConsumables: number;
    pendingPurchaseOrders: number;
    partialPurchaseOrders: number;
    alerts?: {
      devicesToConfigure: DashboardDeviceAlert[];
      devicesInRepair: DashboardDeviceAlert[];
      lowStockConsumables: DashboardConsumableAlert[];
    };

    recentDeviceMovements?: {
    id: number;
    type: string;
    previousStatus?: string | null;
    newStatus?: string | null;
    detail?: string | null;
    date: string;
    deviceTag: string;
    deviceHostname?: string | null;
    personName?: string | null;
  }[];
};

const user = getUser();

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  

  useEffect(() => {
    api.get('/dashboard/summary').then((response) => {
      setSummary(response.data);
    });
  }, []);

  return (
    <AppLayout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">
          Bienvenido, {user?.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Typography>
      </Box>

      {!summary ? (
        <Typography>Cargando...</Typography>
      ) : (
        <>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 2,
          }}
        >
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Dispositivos a configurar</Typography>
            <Typography variant="h4">{summary.devicesToConfigure}</Typography>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Consumibles con stock bajo</Typography>
            <Typography variant="h4">{summary.lowStockConsumables}</Typography>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Órdenes pendientes</Typography>
            <Typography variant="h4">{summary.pendingPurchaseOrders}</Typography>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Órdenes parciales</Typography>
            <Typography variant="h4">{summary.partialPurchaseOrders}</Typography>
          </Paper>
        </Box>
        
        {summary.alerts && (
          <Box sx={{ mt: 4, display: 'grid', gap: 3 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Consumibles con stock bajo
              </Typography>
                
              {summary.alerts.lowStockConsumables.length === 0 ? (
                <Typography>No hay consumibles con stock bajo.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Consumible</TableCell>
                      <TableCell>Stock actual</TableCell>
                      <TableCell>Stock mínimo</TableCell>
                      <TableCell>Unidad</TableCell>
                    </TableRow>
                  </TableHead>
              
                  <TableBody>
                    {summary.alerts.lowStockConsumables.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.name} {item.model}
                          {item.variant ? ` - ${item.variant}` : ''}
                        </TableCell>
                        <TableCell>{item.currentStock}</TableCell>
                        <TableCell>{item.minimumStock}</TableCell>
                        <TableCell>{item.unitMeasure || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
            
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Dispositivos a configurar
              </Typography>
            
              {summary.alerts.devicesToConfigure.length === 0 ? (
                <Typography>No hay dispositivos pendientes de configuración.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tag</TableCell>
                      <TableCell>Hostname</TableCell>
                      <TableCell>Modelo</TableCell>
                      <TableCell>Serial</TableCell>
                    </TableRow>
                  </TableHead>
              
                  <TableBody>
                    {summary.alerts.devicesToConfigure.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell>{device.tag}</TableCell>
                        <TableCell>{device.hostname || '-'}</TableCell>
                        <TableCell>{device.model}</TableCell>
                        <TableCell>{device.serialNumber}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
            
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Dispositivos en reparación
              </Typography>
            
              {summary.alerts.devicesInRepair.length === 0 ? (
                <Typography>No hay dispositivos en reparación.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tag</TableCell>
                      <TableCell>Hostname</TableCell>
                      <TableCell>Modelo</TableCell>
                      <TableCell>Serial</TableCell>
                    </TableRow>
                  </TableHead>
              
                  <TableBody>
                    {summary.alerts.devicesInRepair.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell>{device.tag}</TableCell>
                        <TableCell>{device.hostname || '-'}</TableCell>
                        <TableCell>{device.model}</TableCell>
                        <TableCell>{device.serialNumber}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>

            {summary.recentDeviceMovements && (
              <Paper sx={{ p: 2, mt: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Últimos movimientos de dispositivos
                </Typography>
                        
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Dispositivo</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Estado anterior</TableCell>
                      <TableCell>Estado nuevo</TableCell>
                      <TableCell>Persona</TableCell>
                      <TableCell>Detalle</TableCell>
                    </TableRow>
                  </TableHead>
                        
                  <TableBody>
                    {summary.recentDeviceMovements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>{new Date(movement.date).toLocaleString()}</TableCell>
                        <TableCell>
                          {movement.deviceTag}
                          {movement.deviceHostname ? ` - ${movement.deviceHostname}` : ''}
                        </TableCell>
                        <TableCell>{movement.type}</TableCell>
                        <TableCell>{movement.previousStatus || '-'}</TableCell>
                        <TableCell>{movement.newStatus || '-'}</TableCell>
                        <TableCell>{movement.personName || '-'}</TableCell>
                        <TableCell>{movement.detail || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </Box>
        )}
        
        </>
        
      )}

      
    </AppLayout>
  );
}