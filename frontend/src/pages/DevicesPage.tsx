import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { api } from '../api/axios';
import AppLayout from '../components/AppLayout';
import { getUser } from '../auth/auth.storage';

type Device = {
  id: number;
  tag: string;
  serialNumber: string;
  hostname?: string | null;
  location?: string | null;
  category?: { name: string };
  model?: { brand: string; model: string };
  status?: { 
    code: string;
    name: string; 
  };
  assignments?: {
    id: number;
    person: {
      fullName: string;
    };
    
  }[];
};

type DeviceModel = {
  id: number;
  brand: string;
  model: string;
  category?: {
    id : number;
    name: string;
  };
};

type DeviceCategory = {
  id: number;
  name: string;
};

type Person = {
  id: number;
  fullName: string;
  employeeId: string;
};

type DeviceMovement = {
  id: number;
  type: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  detail?: string | null;
  date: string;
  person?: {
    fullName: string;
  } | null;
};

export default function DevicesPage() {
  const user = getUser();
  const canEdit = user?.role === 'EDICION';
  const [devices, setDevices] = useState<Device[]>([]);

  const [search, setSearch] = useState('');
  const [statusCode, setStatusCode] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [assigned, setAssigned] = useState('');
  const [location, setLocation] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [newDevice, setNewDevice] = useState({
    modelId: '',
    serialNumber: '',
    hostname: '',
    location: '',
    statusCode: 'DISPONIBLE',
    notes: '',
  });
  const [models, setModels] = useState<DeviceModel[]>([]);
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const filteredModels = selectedCategoryId
  ? models.filter(
      (model) => model.category?.id === Number(selectedCategoryId)
    )
  : models;

  const [people, setPeople] = useState<Person[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [openManage, setOpenManage] = useState(false);

  const [assignmentForm, setAssignmentForm] = useState({
    personId: '',
    notes: '',
  });
  const [manageHostname, setManageHostname] = useState('');
  const [statusForm, setStatusForm] = useState({
    statusCode: '',
    notes: '',
  });
  const [openDetail, setOpenDetail] = useState(false);
  const [detailDevice, setDetailDevice] = useState<Device | null>(null);
  const [movements, setMovements] = useState<DeviceMovement[]>([]);

  async function loadDevices() {
    const params: any = {};

    if (search) params.search = search;
    if (statusCode) params.statusCode = statusCode;
    if (categoryName) params.categoryName = categoryName;
    if (assigned) params.assigned = assigned;
    if (location) params.search = location;

    const response = await api.get('/devices', { params });
    setDevices(response.data);
  }

  useEffect(() => {
    loadDevices();
    loadModels();
    loadCategories();
    loadPeople();
  }, []);

  function clearFilters() {
    setSearch('');
    setStatusCode('');
    setCategoryName('');
    setAssigned('');
    setLocation('');
  }

  async function handleCreateDevice() {
    await api.post('/devices/manual-smart', {
      modelId: Number(newDevice.modelId),
      serialNumber: newDevice.serialNumber,
      hostname: newDevice.hostname,
      location: newDevice.location,
      statusCode: newDevice.statusCode,
      notes: newDevice.notes,
    });

    setSelectedCategoryId('');
    setOpenCreate(false);

    setNewDevice({
      modelId: '',
      serialNumber: '',
      hostname: '',
      location: '',
      statusCode: 'DISPONIBLE',
      notes: '',
    });

    loadDevices();
  }

  async function loadModels() {
      const response = await api.get('/device-models');
      setModels(response.data);
  }

  async function loadCategories() {
    const response = await api.get('/device-categories');
    setCategories(response.data);
  }

  function resetCreateModal() {
      setNewDevice({
        modelId: '',
        serialNumber: '',
        hostname: '',
        location: '',
        statusCode: 'DISPONIBLE',
        notes: '',
      });
    
      setSelectedCategoryId('');
      setOpenCreate(false);
    }

  async function loadPeople() {
    const response = await api.get('/people');
    setPeople(response.data);
  }

  function openManageModal(device: Device) {
    setSelectedDevice(device);
    setManageHostname(device.hostname || '');
    setAssignmentForm({
      personId: '',
      notes: '',
    });
    setStatusForm({
      statusCode: '',
      notes: '',
    });
    setOpenManage(true);
  }

  async function handleAssignDevice() {
    if (!selectedDevice) return;

    await api.post('/assignments', {
      deviceId: selectedDevice.id,
      personId: Number(assignmentForm.personId),
      notes: assignmentForm.notes,
    });

    setOpenManage(false);
    setSelectedDevice(null);
    setAssignmentForm({
      personId: '',
      notes: '',
    });

    loadDevices();
  }

  async function handleUpdateHostname() {
  if (!selectedDevice) return;

  await api.patch(`/devices/${selectedDevice.id}`, {
    hostname: manageHostname,
  });

  loadDevices();
  }

  async function handleReturnDevice() {
    if (!selectedDevice) return;

    const assignment = selectedDevice.assignments?.[0];
    if (!assignment) return;

    await api.patch(`/assignments/${assignment.id}/return`, {
      notes: 'Devolución desde frontend',
    });

    setOpenManage(false);
    setSelectedDevice(null);

    loadDevices();
  }

  async function handleChangeStatus() {
  if (!selectedDevice) return;

  await api.patch(`/devices/${selectedDevice.id}/status`, {
      statusCode: statusForm.statusCode,
      notes: statusForm.notes,
    });

    setOpenManage(false);
    setSelectedDevice(null);
    setStatusForm({
      statusCode: '',
      notes: '',
    });

    loadDevices();
  }

  const availableStatuses = [
    { code: 'A_CONFIGURAR', label: 'A configurar' },
    { code: 'DISPONIBLE', label: 'Disponible' },
    { code: 'EN_REPARACION', label: 'En reparación' },
    { code: 'EN_BAJA', label: 'En baja' },
  ].filter((status) => status.code !== selectedDevice?.status?.code);

  async function openDetailModal(device: Device) {
  setDetailDevice(device);
  setOpenDetail(true);

  const response = await api.get(`/devices/${device.id}/movements`);
  setMovements(response.data);
}

  return (
    <AppLayout>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Dispositivos
      </Typography>

      {canEdit && (
        <Button variant="contained" 
        sx={{ mb: 2 }}
        onClick={() => setOpenCreate(true)}
        >
          Nuevo dispositivo
        </Button>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Filtros
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2,
          }}
        >
          <TextField
            label="Buscar por tag, serial, hostname, marca o modelo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <TextField
            select
            label="Estado"
            value={statusCode}
            onChange={(e) => setStatusCode(e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="DISPONIBLE">Disponible</MenuItem>
            <MenuItem value="EN_FUNCIONAMIENTO">En funcionamiento</MenuItem>
            <MenuItem value="A_CONFIGURAR">A configurar</MenuItem>
            <MenuItem value="EN_BAJA">En baja</MenuItem>
          </TextField>

          <TextField
            select
            label="Categoría"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
          >
            <MenuItem value="">Todas</MenuItem>
            <MenuItem value="Notebook">Notebook</MenuItem>
            <MenuItem value="Desktop">Desktop</MenuItem>
            <MenuItem value="Monitor">Monitor</MenuItem>
          </TextField>

          <TextField
            select
            label="Asignado"
            value={assigned}
            onChange={(e) => setAssigned(e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="true">Sí</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </TextField>

          <TextField
            label="Ubicación"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" onClick={loadDevices}>
              Buscar
            </Button>

            <Button variant="outlined" onClick={clearFilters}>
              Limpiar
            </Button>
          </Box>
        </Box>
      </Paper>


      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tag</TableCell>
              <TableCell>Serialnumber</TableCell>
              <TableCell>Hostname</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Marca / Modelo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Ubicación</TableCell>
              <TableCell>Asignado a</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {devices.map((device) => (
              <TableRow
                key={device.id}
                hover
                onDoubleClick={() => openDetailModal(device)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>{device.tag}</TableCell>
                <TableCell>{device.serialNumber}</TableCell>
                <TableCell>{device.hostname || '-'}</TableCell>
                <TableCell>{device.category?.name || '-'}</TableCell>
                <TableCell>
                  {device.model
                    ? `${device.model.brand} - ${device.model.model}`
                    : '-'}
                </TableCell>
                <TableCell>{device.status?.name || '-'}</TableCell>
                <TableCell>{device.location || '-'}</TableCell>
                <TableCell>
                  {device.assignments?.[0]?.person?.fullName || 'Sin asignar'}
                </TableCell>
                <TableCell>
                  {canEdit && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => openManageModal(device)}
                    >
                      Gestionar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {devices.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No hay dispositivos para mostrar
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={openCreate} onClose={resetCreateModal} maxWidth="sm" fullWidth>
  <DialogTitle>Nuevo dispositivo</DialogTitle>

  <DialogContent>
    <TextField
      select
      label="Categoría"
      fullWidth
      margin="normal"
      value={selectedCategoryId}
      onChange={(e) => {
        setSelectedCategoryId(e.target.value);
        setNewDevice({ ...newDevice, modelId: '' });
      }}
    >
      {categories.map((category) => (
        <MenuItem key={category.id} value={category.id}>
          {category.name}
        </MenuItem>
      ))}
    </TextField>
    
    <TextField
      select
      label="Modelo"
      fullWidth
      margin="normal"
      value={newDevice.modelId}
      onChange={(e) =>
        setNewDevice({ ...newDevice, modelId: e.target.value })
      }
      disabled={!selectedCategoryId}
    >
      {filteredModels.map((model) => (
        <MenuItem key={model.id} value={model.id}>
          {model.brand} {model.model}
        </MenuItem>
      ))}
    </TextField>

    <TextField
      label="Número de serie"
      fullWidth
      margin="normal"
      value={newDevice.serialNumber}
      onChange={(e) =>
        setNewDevice({ ...newDevice, serialNumber: e.target.value })
      }
    />

    <TextField
      label="Hostname"
      fullWidth
      margin="normal"
      value={newDevice.hostname}
      onChange={(e) =>
        setNewDevice({ ...newDevice, hostname: e.target.value })
      }
    />

    <TextField
      label="Ubicación"
      fullWidth
      margin="normal"
      value={newDevice.location}
      onChange={(e) =>
        setNewDevice({ ...newDevice, location: e.target.value })
      }
    />

      <TextField
            select
            label="Estado"
            fullWidth
            margin="normal"
            value={newDevice.statusCode}
            onChange={(e) =>
              setNewDevice({ ...newDevice, statusCode: e.target.value })
            }
          >
            <MenuItem value="DISPONIBLE">Disponible</MenuItem>
            <MenuItem value="A_CONFIGURAR">A configurar</MenuItem>
          </TextField>
          
          <TextField
            label="Observaciones"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={newDevice.notes}
            onChange={(e) =>
              setNewDevice({ ...newDevice, notes: e.target.value })
            }
          />
        </DialogContent>
          
        <DialogActions>
          <Button onClick={resetCreateModal}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreateDevice} >
            Crear
          </Button>
        </DialogActions>
        </Dialog>

        <Dialog
          open={openManage}
          onClose={() => setOpenManage(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Gestionar dispositivo</DialogTitle>

          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              {selectedDevice
                ? `${selectedDevice.tag} - ${selectedDevice.hostname || selectedDevice.serialNumber}`
                : ''}
            </Typography>
              
            <Typography sx={{ mb: 2 }}>
              Estado actual: {selectedDevice?.status?.name || '-'}
            </Typography>

              <TextField
                  select
                  label="Cambiar estado"
                  fullWidth
                  margin="normal"
                  value={statusForm.statusCode}
                  onChange={(e) =>
                    setStatusForm({
                      ...statusForm,
                      statusCode: e.target.value,
                    })
                  }
                >
                  <MenuItem value="">Seleccionar estado</MenuItem>

                  {availableStatuses.map((status) => (
                    <MenuItem key={status.code} value={status.code}>
                      {status.label}
                    </MenuItem>
                  ))}
              </TextField>
                
                <TextField
                  label="Motivo / observación del cambio"
                  fullWidth
                  margin="normal"
                  value={statusForm.notes}
                  onChange={(e) =>
                    setStatusForm({
                      ...statusForm,
                      notes: e.target.value,
                    })
                  }
                />
              
            {selectedDevice?.status?.name === 'Disponible' && (
              <>
                <TextField
                  label="Hostname"
                  fullWidth
                  margin="normal"
                  value={manageHostname}
                  onChange={(e) => setManageHostname(e.target.value)}
                />

                <Button
                  variant="outlined"
                  onClick={handleUpdateHostname}
                  sx={{ mb: 2 }}
                >
                  Guardar hostname
                </Button>


                <TextField
                  select
                  label="Asignar a persona"
                  fullWidth
                  margin="normal"
                  value={assignmentForm.personId}
                  onChange={(e) =>
                    setAssignmentForm({
                      ...assignmentForm,
                      personId: e.target.value,
                    })
                  }
                >
                  {people.map((person) => (
                    <MenuItem key={person.id} value={person.id}>
                      {person.fullName} - {person.employeeId}
                    </MenuItem>
                  ))}
                </TextField>
                
                <TextField
                  label="Observaciones"
                  fullWidth
                  margin="normal"
                  multiline
                  rows={3}
                  value={assignmentForm.notes}
                  onChange={(e) =>
                    setAssignmentForm({
                      ...assignmentForm,
                      notes: e.target.value,
                    })
                  }
                />
              </>
            )} 
          </DialogContent>
          
          
          <DialogActions>
            <Button onClick={() => setOpenManage(false)}>Cerrar</Button>

            {(selectedDevice?.assignments?.length ?? 0) > 0 && (
              <Button
                color="warning"
                variant="contained"
                onClick={handleReturnDevice}
              >
                Devolver
              </Button>
            )}

            {selectedDevice?.status?.name === 'Disponible' && (
              <Button
                variant="contained"
                onClick={handleAssignDevice}
                disabled={!assignmentForm.personId}
              >
                Asignar
              </Button>
            )}

            <Button
              variant="outlined"
              onClick={handleChangeStatus}
              disabled={!statusForm.statusCode}
            >
              Cambiar estado
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={openDetail}
          onClose={() => setOpenDetail(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Detalle del dispositivo</DialogTitle>
                  
          <DialogContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {detailDevice?.tag} - {detailDevice?.hostname || detailDevice?.serialNumber}
            </Typography>
                  
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 2,
                mb: 3,
              }}
            >
              <Typography><strong>Tag:</strong> {detailDevice?.tag}</Typography>
              <Typography><strong>Serial:</strong> {detailDevice?.serialNumber}</Typography>
              <Typography><strong>Hostname:</strong> {detailDevice?.hostname || '-'}</Typography>
              <Typography><strong>Ubicación:</strong> {detailDevice?.location || '-'}</Typography>
              <Typography><strong>Categoría:</strong> {detailDevice?.category?.name || '-'}</Typography>
              <Typography>
                <strong>Modelo:</strong>{' '}
                {detailDevice?.model
                  ? `${detailDevice.model.brand} ${detailDevice.model.model}`
                  : '-'}
              </Typography>
              <Typography><strong>Estado:</strong> {detailDevice?.status?.name || '-'}</Typography>
              <Typography>
                <strong>Asignado a:</strong>{' '}
                {detailDevice?.assignments?.[0]?.person?.fullName || 'Sin asignar'}
              </Typography>
            </Box>
                
            <Typography variant="h6" sx={{ mb: 1 }}>
              Historial
            </Typography>
                
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Estado anterior</TableCell>
                  <TableCell>Estado nuevo</TableCell>
                  <TableCell>Persona</TableCell>
                  <TableCell>Detalle</TableCell>
                </TableRow>
              </TableHead>
                
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      {new Date(movement.date).toLocaleString()}
                    </TableCell>
                    <TableCell>{movement.type}</TableCell>
                    <TableCell>{movement.previousStatus || '-'}</TableCell>
                    <TableCell>{movement.newStatus || '-'}</TableCell>
                    <TableCell>{movement.person?.fullName || '-'}</TableCell>
                    <TableCell>{movement.detail || '-'}</TableCell>
                  </TableRow>
                ))}
        
                {movements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Sin movimientos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DialogContent>
              
          <DialogActions>
            <Button onClick={() => setOpenDetail(false)}>Cerrar</Button>
          </DialogActions>
        </Dialog>
    </AppLayout>
  );
}