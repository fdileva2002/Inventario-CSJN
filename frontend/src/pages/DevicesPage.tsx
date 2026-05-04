import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
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
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';
import { api } from '../api/axios';
import AppLayout from '../components/AppLayout';
import { getUser } from '../auth/auth.storage';
import * as XLSX from 'xlsx';

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
    department?: { name: string } | null;
    
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
  const [assignedTo, setAssignedTo] = useState('');
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
  departmentId: '',
  notes: '',
  location: '',
});
  const [manageHostname, setManageHostname] = useState('');
  const [statusForm, setStatusForm] = useState({
    statusCode: '',
    notes: '',
    location: '',
  });
  const [openDetail, setOpenDetail] = useState(false);
  const [detailDevice, setDetailDevice] = useState<Device | null>(null);
  const [movements, setMovements] = useState<DeviceMovement[]>([]);
  const [openDelete, setOpenDelete] = useState(false);
  const [departments, setDepartments] = useState<{id: number, name: string}[]>([]);
  const [assignmentTarget, setAssignmentTarget] = useState<'person' | 'department'>('person');
  const [modelId, setModelId] = useState('');
  const [page, setPage] = useState(0);
  const rowsPerPage = 40;
  const [assignedSearch, setAssignedSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  async function loadDevices() {
    const params: any = {};
    if (search.trim()) params.search = search;
    if (statusCode) params.statusCode = statusCode;
    if (categoryName) params.categoryName = categoryName;
    if (assignedTo.trim()) params.assignedTo = assignedTo;
    if (location.trim()) params.location = location;
    if (modelId) params.modelId = Number(modelId);
    params.page = page;
    params.limit = 20;

    const response = await api.get('/devices', { params });
    setDevices(response.data.data);    // ← antes era response.data
    setTotal(response.data.total);
    setTotalPages(response.data.totalPages);
  }

  useEffect(() => {
    loadDevices();
    loadModels();
    loadCategories();
    loadPeople();

    api.get('/departments').then((res) => setDepartments(res.data));
  }, []);

  useEffect(() => {
    loadDevices();
  }, [page]);

  function clearFilters() {
    setSearch('');
    setStatusCode('');
    setCategoryName('');
    setAssignedSearch('');
    setLocation('');
    setModelId('');
    setAssignedTo('');
  }

  async function handleCreateDevice() {
    try {
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
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al crear dispositivo');
    }
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
      departmentId: '',
      notes: '',
      location: '',
    });
    setStatusForm({
      statusCode: '',
      notes: '',
      location: '',
    });
    setOpenManage(true);
  }

  async function handleAssignDevice() {
    if (!selectedDevice) return;

    try {
      await api.post('/assignments', {
        deviceId: selectedDevice.id,
        personId: assignmentTarget === 'person' ? Number(assignmentForm.personId) : undefined,
        departmentId: assignmentTarget === 'department' ? Number(assignmentForm.departmentId) : undefined,
        notes: assignmentForm.notes,
        location: assignmentForm.location || undefined,
      });

      setOpenManage(false);
      setSelectedDevice(null);
      setAssignmentForm({ personId: '', departmentId: '', notes: '', location: '' });
      setAssignmentTarget('person');
      loadDevices();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al asignar dispositivo');
    }
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
    if (!selectedDevice || !statusForm.statusCode) return;

    const statusLabel = availableStatuses.find(
      (s) => s.code === statusForm.statusCode
    )?.label;

    const confirmed = window.confirm(
      `¿Confirmás cambiar el estado de ${selectedDevice.tag} a "${statusLabel}"?`
    );

    if (!confirmed) return;

    try {
      await api.patch(`/devices/${selectedDevice.id}/status`, {
        statusCode: statusForm.statusCode,
        notes: statusForm.notes,
      });

      setOpenManage(false);
      setSelectedDevice(null);
      setStatusForm({ statusCode: '', notes: '', location:'' });
      loadDevices();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al cambiar estado');
    }
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

  async function handleDeleteDevice() {
    if (!selectedDevice) return;
    try {
      await api.delete(`/devices/${selectedDevice.id}`);
      setOpenDelete(false);
      setSelectedDevice(null);
      loadDevices();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al eliminar dispositivo');
    }
  }

  function exportToExcel() {
    const rows = devices.map((device) => ({
      Tag: device.tag,
      'Número de serie': device.serialNumber,
      Hostname: device.hostname || '-',
      Categoría: device.category?.name || '-',
      Marca: device.model?.brand || '-',
      Modelo: device.model?.model || '-',
      Estado: device.status?.name || '-',
      Ubicación: device.location || '-',
      'Asignado a': device.assignments?.[0]?.person?.fullName || 'Sin asignar',
    }));
  
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dispositivos');
    XLSX.writeFile(workbook, `dispositivos_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`);
  }

  return (
    <AppLayout>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Dispositivos
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        {canEdit && (
          <Button variant="contained" onClick={() => setOpenCreate(true)}>
            Nuevo dispositivo
          </Button>
        )}
        <Button variant="outlined" onClick={exportToExcel} disabled={devices.length === 0}>
          Exportar a Excel
        </Button>
      </Box>

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
            onChange={(e) => {
              setCategoryName(e.target.value);
              setModelId(''); // limpiar modelo al cambiar categoría
            }}
          >
            <MenuItem value="">Todas</MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.name}>
                {cat.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Modelo"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            {models
              .filter((m) => categoryName === '' || m.category?.name === categoryName)
              .map((model) => (
                <MenuItem key={model.id} value={model.id}>
                  {model.brand} {model.model}
                </MenuItem>
              ))}
          </TextField>

          
          <TextField
            label="Persona o dependencia"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
          />

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
            {devices
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((device) => (
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
                <TableCell>
                  <Chip
                    label={device.status?.name || '-'}
                    size="small"
                    color={
                      device.status?.code === 'DISPONIBLE' ? 'success' :
                      device.status?.code === 'EN_FUNCIONAMIENTO' ? 'primary' :
                      device.status?.code === 'EN_REPARACION' ? 'warning' :
                      device.status?.code === 'EN_BAJA' ? 'error' :
                      device.status?.code === 'A_CONFIGURAR' ? 'default' :
                      'default'
                    }
                  />
                </TableCell>
                <TableCell>{device.location || '-'}</TableCell>
                <TableCell>
                  {device.assignments?.[0]?.person?.fullName
                    ? device.assignments[0].person.fullName
                    : device.assignments?.[0]?.department?.name
                    ? `Dep: ${device.assignments[0].department.name}`
                    : 'Sin asignar'}
                </TableCell>
                
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {canEdit && (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openManageModal(device)}
                        >
                          Gestionar
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDevice(device);
                            setOpenDelete(true);
                          }}
                        >
                          Eliminar
                        </Button>
                      </>
                    )}
                  </Box>
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
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={40}
          rowsPerPageOptions={[40]}
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} de ${count}`
          }
        />
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

              {selectedDevice?.status?.code !== 'EN_FUNCIONAMIENTO' && (
                <>
                  <TextField
                    select
                    label="Cambiar estado"
                    fullWidth
                    margin="normal"
                    value={statusForm.statusCode}
                    onChange={(e) =>
                      setStatusForm({ ...statusForm, statusCode: e.target.value })
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
                      setStatusForm({ ...statusForm, notes: e.target.value })
                    }
                  />
                </>
              )}
                
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
                  label="Asignar a"
                  fullWidth
                  margin="normal"
                  value={assignmentTarget}
                  onChange={(e) => {
                    setAssignmentTarget(e.target.value as 'person' | 'department');
                    setAssignmentForm({ ...assignmentForm, personId: '', departmentId: '' });
                  }}
                >
                  <MenuItem value="person">Persona</MenuItem>
                  <MenuItem value="department">Dependencia</MenuItem>
                </TextField>
                
                {assignmentTarget === 'person' ? (
                  <TextField
                    select
                    label="Persona"
                    fullWidth
                    margin="normal"
                    value={assignmentForm.personId}
                    onChange={(e) =>
                      setAssignmentForm({ ...assignmentForm, personId: e.target.value })
                    }
                  >
                    {people.map((person) => (
                      <MenuItem key={person.id} value={person.id}>
                        {person.fullName} {person.employeeId ? `(${person.employeeId})` : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <TextField
                    select
                    label="Dependencia"
                    fullWidth
                    margin="normal"
                    value={assignmentForm.departmentId ?? ''}
                    onChange={(e) =>
                      setAssignmentForm({ ...assignmentForm, departmentId: e.target.value })
                    }
                  >
                    {departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}

                <TextField
                  label="Ubicación (opcional)"
                  fullWidth
                  margin="normal"
                  value={assignmentForm.location}
                  onChange={(e) =>
                    setAssignmentForm({ ...assignmentForm, location: e.target.value })
                  }
                />
                
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
                disabled={
                  assignmentTarget === 'person'
                    ? !assignmentForm.personId
                    : !assignmentForm.departmentId
                }
              >
                Asignar
              </Button>
            )}

            {selectedDevice?.status?.code !== 'EN_FUNCIONAMIENTO' && (
              <Button
                variant="outlined"
                onClick={handleChangeStatus}
                disabled={!statusForm.statusCode}
              >
                Cambiar estado
              </Button>
            )}
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

        <Dialog open={openDelete} onClose={() => setOpenDelete(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Eliminar dispositivo</DialogTitle>
          <DialogContent>
            <Typography>
              ¿Confirmás que querés eliminar el dispositivo{' '}
              <strong>{selectedDevice?.tag}</strong>?
              Esta acción no se puede deshacer.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDelete(false)}>Cancelar</Button>
            <Button variant="contained" color="error" onClick={handleDeleteDevice}>
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>
    </AppLayout>
  );
}