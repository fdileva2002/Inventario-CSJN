import { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Paper, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography, MenuItem,
} from '@mui/material';
import { api } from '../api/axios';
import AppLayout from '../components/AppLayout';
import { getUser } from '../auth/auth.storage';

type Person = {
  id: number;
  fullName: string;
  employeeId: string;
  email?: string;
  department?: { id: number; name: string } | null;
};

type Department = {
  id: number;
  name: string;
};

type DeviceAssignment = {
  id: number;
  assignedAt: string;
  returnedAt?: string | null;
  status: string;
  notes?: string | null;
  device: {
    tag: string;
    serialNumber: string;
    hostname?: string | null;
    model?: { brand: string; model: string };
    status?: { name: string };
  };
};

type ConsumableAssignment = {
  id: number;
  quantity: number;
  assignedAt: string;
  notes?: string | null;
  consumable: {
    name: string;
    brand?: string | null;
    model: string;
    variant?: string | null;
  };
};

export default function PeoplePage() {
  const user = getUser();
  const canEdit = user?.role === 'EDICION';

  const [people, setPeople] = useState<Person[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [deviceAssignments, setDeviceAssignments] = useState<DeviceAssignment[]>([]);
  const [consumableAssignments, setConsumableAssignments] = useState<ConsumableAssignment[]>([]);

  const [newPerson, setNewPerson] = useState({
    firstName: '',
    lastName: '',
    employeeId: '',
    email: '',
    phone: '',
    departmentId: '',
  });
  const [createError, setCreateError] = useState('');

  async function loadPeople() {
    const params: any = {};
    if (search.trim()) params.search = search;
    if (department.trim()) params.department = department;
    const response = await api.get('/people', { params });
    setPeople(response.data);
  }

  async function loadDepartments() {
    const response = await api.get('/departments');
    setDepartments(response.data);
  }

  useEffect(() => {
    loadPeople();
    loadDepartments();
  }, []);

  async function handleCreatePerson() {
    setCreateError('');
    try {
      await api.post('/people', {
        firstName: newPerson.firstName,
        lastName: newPerson.lastName,
        fullName: `${newPerson.firstName} ${newPerson.lastName}`.trim(),
        employeeId: newPerson.employeeId,
        email: newPerson.email || undefined,
        phone: newPerson.phone || undefined,
        departmentId: newPerson.departmentId ? Number(newPerson.departmentId) : undefined,
      });
      resetCreateModal();
      loadPeople();
    } catch (error: any) {
      setCreateError(error?.response?.data?.message || 'Error al crear persona');
    }
  }

  async function handleDeletePerson() {
    if (!selectedPerson) return;
    try {
      await api.delete(`/people/${selectedPerson.id}`);
      setOpenDelete(false);
      setSelectedPerson(null);
      loadPeople();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al eliminar persona');
    }
  }

  async function openPersonDetail(person: Person) {
    setSelectedPerson(person);
    setOpenDetail(true);
    const [devicesResponse, consumablesResponse] = await Promise.all([
      api.get(`/assignments/person/${person.id}`),
      api.get(`/consumable-assignments/person/${person.id}`),
    ]);
    setDeviceAssignments(devicesResponse.data);
    setConsumableAssignments(consumablesResponse.data);
  }

  function resetCreateModal() {
    setNewPerson({ firstName: '', lastName: '', employeeId: '', email: '', phone: '', departmentId: '' });
    setCreateError('');
    setOpenCreate(false);
  }

  return (
    <AppLayout>
      <Typography variant="h4" sx={{ mb: 3 }}>Personas</Typography>

      {canEdit && (
        <Button variant="contained" sx={{ mb: 2 }} onClick={() => setOpenCreate(true)}>
          Nueva persona
        </Button>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="Buscar por nombre o CUIL"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
        />
        <TextField
          select
          label="Dependencia"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          fullWidth
        >
          <MenuItem value="">Todas</MenuItem>
          {departments.map((d) => (
            <MenuItem key={d.id} value={d.name}>{d.name}</MenuItem>
          ))}
        </TextField>
        <Button variant="contained" onClick={loadPeople}>Buscar</Button>
        <Button variant="outlined" onClick={() => { setSearch(''); setDepartment(''); }}>
          Limpiar
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>CUIL</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Dependencia</TableCell>
              {canEdit && <TableCell>Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {people.map((person) => (
              <TableRow
                key={person.id}
                hover
                onDoubleClick={() => openPersonDetail(person)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>{person.fullName}</TableCell>
                <TableCell>{person.employeeId}</TableCell>
                <TableCell>{person.email || '-'}</TableCell>
                <TableCell>{person.department?.name || '-'}</TableCell>
                {canEdit && (
                  <TableCell>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPerson(person);
                        setOpenDelete(true);
                      }}
                    >
                      Eliminar
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {people.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 5 : 4} align="center">
                  No hay personas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Modal crear persona */}
      <Dialog open={openCreate} onClose={resetCreateModal} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva persona</DialogTitle>
        <DialogContent>
          <TextField label="Nombre" fullWidth margin="normal"
            value={newPerson.firstName}
            onChange={(e) => setNewPerson({ ...newPerson, firstName: e.target.value })}
          />
          <TextField label="Apellido" fullWidth margin="normal"
            value={newPerson.lastName}
            onChange={(e) => setNewPerson({ ...newPerson, lastName: e.target.value })}
          />
          <TextField label="CUIL" fullWidth margin="normal"
            value={newPerson.employeeId}
            onChange={(e) => setNewPerson({ ...newPerson, employeeId: e.target.value })}
          />
          <TextField label="Email" fullWidth margin="normal"
            value={newPerson.email}
            onChange={(e) => setNewPerson({ ...newPerson, email: e.target.value })}
          />
          <TextField label="Teléfono" fullWidth margin="normal"
            value={newPerson.phone}
            onChange={(e) => setNewPerson({ ...newPerson, phone: e.target.value })}
          />
          <TextField select label="Dependencia" fullWidth margin="normal"
            value={newPerson.departmentId}
            onChange={(e) => setNewPerson({ ...newPerson, departmentId: e.target.value })}
          >
            <MenuItem value="">Sin dependencia</MenuItem>
            {departments.map((d) => (
              <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
            ))}
          </TextField>

          {createError && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {createError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={resetCreateModal}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreatePerson}
            disabled={!newPerson.firstName || !newPerson.lastName || !newPerson.employeeId}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal confirmar eliminar */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar persona</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Confirmás que querés eliminar a <strong>{selectedPerson?.fullName}</strong>?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeletePerson}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal detalle */}
      <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalle de persona</DialogTitle>
        <DialogContent>
          <Typography variant="h6" sx={{ mb: 1 }}>{selectedPerson?.fullName}</Typography>
          <Typography sx={{ mb: 3 }}>
            CUIL: {selectedPerson?.employeeId} | Dependencia: {selectedPerson?.department?.name || '-'}
          </Typography>

          <Typography variant="h6" sx={{ mb: 1 }}>Dispositivos asignados</Typography>
          <Table size="small" sx={{ mb: 4 }}>
            <TableHead>
              <TableRow>
                <TableCell>Tag</TableCell>
                <TableCell>Hostname</TableCell>
                <TableCell>Modelo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Fecha asignación</TableCell>
                <TableCell>Fecha devolución</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deviceAssignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.device.tag}</TableCell>
                  <TableCell>{a.device.hostname || '-'}</TableCell>
                  <TableCell>
                    {a.device.model ? `${a.device.model.brand} ${a.device.model.model}` : '-'}
                  </TableCell>
                  <TableCell>{a.status}</TableCell>
                  <TableCell>{new Date(a.assignedAt).toLocaleString()}</TableCell>
                  <TableCell>{a.returnedAt ? new Date(a.returnedAt).toLocaleString() : 'Activo'}</TableCell>
                </TableRow>
              ))}
              {deviceAssignments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">Sin dispositivos asignados</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Typography variant="h6" sx={{ mb: 1 }}>Consumibles entregados</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Consumible</TableCell>
                <TableCell>Cantidad</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Observación</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {consumableAssignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    {a.consumable.name} {a.consumable.model}
                    {a.consumable.variant ? ` - ${a.consumable.variant}` : ''}
                  </TableCell>
                  <TableCell>{a.quantity}</TableCell>
                  <TableCell>{new Date(a.assignedAt).toLocaleString()}</TableCell>
                  <TableCell>{a.notes || '-'}</TableCell>
                </TableRow>
              ))}
              {consumableAssignments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">Sin consumibles entregados</TableCell>
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