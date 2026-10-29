import { useEffect, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { api } from '../api/axios';
import { getPermissions } from '../auth/permissions';
import AppLayout from '../components/AppLayout';

type ComponentStatus = 'DISPONIBLE' | 'INSTALADO' | 'BAJA';

type DeviceSummary = { id: number; tag: string; hostname?: string | null };

type ComponentItem = {
  id: number;
  type: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  capacity?: string | null;
  notes?: string | null;
  status: ComponentStatus;
  device?: DeviceSummary | null;
};

type ComponentMovement = {
  id: number;
  type: 'ALTA' | 'INSTALACION' | 'RETIRO' | 'BAJA';
  detail?: string | null;
  date: string;
  device?: DeviceSummary | null;
  user?: { name: string } | null;
};

const statusLabels: Record<ComponentStatus, string> = {
  DISPONIBLE: 'En depósito',
  INSTALADO: 'Instalado',
  BAJA: 'De baja',
};

const statusColors: Record<ComponentStatus, 'success' | 'primary' | 'default'> = {
  DISPONIBLE: 'success',
  INSTALADO: 'primary',
  BAJA: 'default',
};

const movementLabels: Record<ComponentMovement['type'], string> = {
  ALTA: 'Alta',
  INSTALACION: 'Instalación',
  RETIRO: 'Retiro',
  BAJA: 'Baja',
};

const emptyForm = { type: '', brand: '', model: '', serialNumber: '', capacity: '', notes: '' };
const rowsPerPage = 40;

function deviceLabel(device?: DeviceSummary | null) {
  if (!device) return '-';
  return device.hostname ? `${device.tag} (${device.hostname})` : device.tag;
}

function describe(component: ComponentItem) {
  return [component.type, component.brand, component.model, component.capacity].filter(Boolean).join(' ');
}

export default function ComponentsPage() {
  const { canLoad, canAssign } = getPermissions();

  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [types, setTypes] = useState<string[]>([]);
  const [filters, setFilters] = useState({ search: '', type: '', status: '' });

  // Alta / edición
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<ComponentItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Instalar / mover
  const [installing, setInstalling] = useState<ComponentItem | null>(null);
  const [deviceOptions, setDeviceOptions] = useState<DeviceSummary[]>([]);
  const [targetDevice, setTargetDevice] = useState<DeviceSummary | null>(null);
  const [installNotes, setInstallNotes] = useState('');

  // Retiro o baja (comparten el diálogo de observaciones)
  const [notesAction, setNotesAction] = useState<{ component: ComponentItem; kind: 'uninstall' | 'discard' } | null>(null);
  const [actionNotes, setActionNotes] = useState('');

  // Historial
  const [historyOf, setHistoryOf] = useState<ComponentItem | null>(null);
  const [history, setHistory] = useState<ComponentMovement[]>([]);

  async function loadComponents(targetPage = page) {
    const params: Record<string, string | number> = { page: targetPage, limit: rowsPerPage };
    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.type) params.type = filters.type;
    if (filters.status) params.status = filters.status;

    const response = await api.get('/components', { params });
    setComponents(response.data.data);
    setTotal(response.data.total);
  }

  async function loadTypes() {
    const response = await api.get('/components/types');
    setTypes(response.data);
  }

  useEffect(() => {
    loadTypes();
  }, []);

  useEffect(() => {
    loadComponents(page);
  }, [page]);

  function search() {
    setPage(0);
    loadComponents(0);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpenForm(true);
  }

  function openEdit(component: ComponentItem) {
    setEditing(component);
    setForm({
      type: component.type,
      brand: component.brand ?? '',
      model: component.model ?? '',
      serialNumber: component.serialNumber ?? '',
      capacity: component.capacity ?? '',
      notes: component.notes ?? '',
    });
    setOpenForm(true);
  }

  async function saveForm() {
    try {
      if (editing) {
        await api.patch(`/components/${editing.id}`, form);
      } else {
        await api.post('/components', form);
      }
      setOpenForm(false);
      loadComponents();
      loadTypes();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al guardar el componente');
    }
  }

  async function searchDevices(query: string) {
    if (query.trim().length < 2) return;
    const response = await api.get('/devices', { params: { search: query, limit: 20 } });
    setDeviceOptions(response.data.data);
  }

  function openInstall(component: ComponentItem) {
    setInstalling(component);
    setTargetDevice(null);
    setDeviceOptions([]);
    setInstallNotes('');
  }

  async function confirmInstall() {
    if (!installing || !targetDevice) return;
    try {
      await api.post(`/components/${installing.id}/install`, {
        deviceId: targetDevice.id,
        notes: installNotes || undefined,
      });
      setInstalling(null);
      loadComponents();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al instalar el componente');
    }
  }

  async function confirmNotesAction() {
    if (!notesAction) return;
    const path = notesAction.kind === 'uninstall' ? 'uninstall' : 'discard';
    try {
      await api.post(`/components/${notesAction.component.id}/${path}`, {
        notes: actionNotes || undefined,
      });
      setNotesAction(null);
      setActionNotes('');
      loadComponents();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al registrar la operación');
    }
  }

  async function openHistory(component: ComponentItem) {
    setHistoryOf(component);
    setHistory([]);
    const response = await api.get(`/components/${component.id}/movements`);
    setHistory(response.data);
  }

  return (
    <AppLayout>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Componentes
      </Typography>

      {canLoad && (
        <Button variant="contained" sx={{ mb: 2 }} onClick={openCreate}>
          Nuevo componente
        </Button>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr auto' },
            gap: 2,
            alignItems: 'center',
          }}
        >
          <TextField
            label="Buscar por tipo, marca, modelo, serial o equipo"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <TextField
            select
            label="Tipo"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <MenuItem value="">Todos</MenuItem>
            {types.map((type) => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Estado"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <MenuItem value="">Todos</MenuItem>
            {(Object.keys(statusLabels) as ComponentStatus[]).map((status) => (
              <MenuItem key={status} value={status}>{statusLabels[status]}</MenuItem>
            ))}
          </TextField>
          <Button variant="contained" onClick={search}>
            Buscar
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell>Marca / Modelo</TableCell>
                <TableCell>Capacidad</TableCell>
                <TableCell>Serial</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Equipo</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {components.map((component) => (
                <TableRow key={component.id} hover>
                  <TableCell>{component.type}</TableCell>
                  <TableCell>{[component.brand, component.model].filter(Boolean).join(' ') || '-'}</TableCell>
                  <TableCell>{component.capacity || '-'}</TableCell>
                  <TableCell>{component.serialNumber || '-'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={statusLabels[component.status]} color={statusColors[component.status]} />
                  </TableCell>
                  <TableCell>{deviceLabel(component.device)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button size="small" onClick={() => openHistory(component)}>
                        Historial
                      </Button>
                      {canAssign && component.status !== 'BAJA' && (
                        <Button size="small" variant="outlined" onClick={() => openInstall(component)}>
                          {component.status === 'INSTALADO' ? 'Mover' : 'Instalar'}
                        </Button>
                      )}
                      {canAssign && component.status === 'INSTALADO' && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          onClick={() => setNotesAction({ component, kind: 'uninstall' })}
                        >
                          Retirar
                        </Button>
                      )}
                      {canLoad && component.status !== 'BAJA' && (
                        <>
                          <Button size="small" variant="outlined" color="info" onClick={() => openEdit(component)}>
                            Editar
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => setNotesAction({ component, kind: 'discard' })}
                          >
                            Dar de baja
                          </Button>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {components.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No hay componentes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[rowsPerPage]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        />
      </Paper>

      {/* Alta / edición */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar componente' : 'Nuevo componente'}</DialogTitle>
        <DialogContent>
          <Autocomplete
            freeSolo
            options={types}
            inputValue={form.type}
            onInputChange={(_, value) => setForm({ ...form, type: value })}
            renderInput={(params) => (
              <TextField {...params} label="Tipo" margin="normal" placeholder="Memoria RAM, Disco, Fuente..." />
            )}
          />
          <TextField label="Marca" fullWidth margin="normal" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <TextField label="Modelo" fullWidth margin="normal" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <TextField label="Capacidad" fullWidth margin="normal" placeholder="16 GB, 512 GB SSD, 650 W..." value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          <TextField label="Número de serie (opcional)" fullWidth margin="normal" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
          <TextField label="Notas" fullWidth margin="normal" multiline minRows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Cancelar</Button>
          <Button variant="contained" onClick={saveForm} disabled={!form.type.trim()}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Instalar / mover */}
      <Dialog open={!!installing} onClose={() => setInstalling(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {installing?.status === 'INSTALADO' ? 'Mover componente' : 'Instalar componente'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>{installing && describe(installing)}</Typography>
          {installing?.device && (
            <Typography variant="body2" color="text.secondary">
              Hoy está en {deviceLabel(installing.device)}; se registrará el retiro de ese equipo.
            </Typography>
          )}
          <Autocomplete
            options={deviceOptions}
            getOptionLabel={(option) => deviceLabel(option)}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={targetDevice}
            onChange={(_, value) => setTargetDevice(value)}
            onInputChange={(_, value) => searchDevices(value)}
            filterOptions={(options) => options}
            noOptionsText="Escribí al menos 2 caracteres del tag, serial o hostname"
            renderInput={(params) => <TextField {...params} label="Equipo destino" margin="normal" />}
          />
          <TextField label="Observaciones" fullWidth margin="normal" value={installNotes} onChange={(e) => setInstallNotes(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstalling(null)}>Cancelar</Button>
          <Button variant="contained" onClick={confirmInstall} disabled={!targetDevice}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Retiro / baja */}
      <Dialog open={!!notesAction} onClose={() => setNotesAction(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{notesAction?.kind === 'uninstall' ? 'Retirar componente' : 'Dar de baja componente'}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>
            {notesAction && describe(notesAction.component)}
            {notesAction?.component.device && ` — en ${deviceLabel(notesAction.component.device)}`}
          </Typography>
          {notesAction?.kind === 'discard' && (
            <Typography variant="body2" color="text.secondary">
              La baja no se puede deshacer. Si está instalado, primero se registra el retiro.
            </Typography>
          )}
          <TextField label="Motivo / observaciones" fullWidth margin="normal" value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotesAction(null)}>Cancelar</Button>
          <Button variant="contained" color={notesAction?.kind === 'discard' ? 'error' : 'warning'} onClick={confirmNotesAction}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Historial */}
      <Dialog open={!!historyOf} onClose={() => setHistoryOf(null)} maxWidth="md" fullWidth>
        <DialogTitle>Historial — {historyOf && describe(historyOf)}</DialogTitle>
        <DialogContent>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 560 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Movimiento</TableCell>
                  <TableCell>Equipo</TableCell>
                  <TableCell>Detalle</TableCell>
                  <TableCell>Usuario</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(movement.date).toLocaleString()}</TableCell>
                    <TableCell>{movementLabels[movement.type]}</TableCell>
                    <TableCell>{deviceLabel(movement.device)}</TableCell>
                    <TableCell>{movement.detail || '-'}</TableCell>
                    <TableCell>{movement.user?.name || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOf(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}
