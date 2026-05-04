import { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Paper, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography, MenuItem, TablePagination,
} from '@mui/material';
import { api } from '../api/axios';
import AppLayout from '../components/AppLayout';
import { getUser } from '../auth/auth.storage';
import * as XLSX from 'xlsx';

type Person = {
  id: number;
  fullName: string;
  employeeId: string;
  email?: string;
  phone?: string;
  department?: { id: number; name: string } | null;
};

type Department = { id: number; name: string };

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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const rowsPerPage = 40;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const [deviceAssignments, setDeviceAssignments] = useState<DeviceAssignment[]>([]);
  const [consumableAssignments, setConsumableAssignments] = useState<ConsumableAssignment[]>([]);

  const [newPerson, setNewPerson] = useState({
    firstName: '', lastName: '', employeeId: '', email: '', phone: '', departmentId: '',
  });
  const [editPerson, setEditPerson] = useState({
    firstName: '', lastName: '', employeeId: '', email: '', phone: '', departmentId: '',
  });
  const [createError, setCreateError] = useState('');
  const [editError, setEditError] = useState('');

  async function loadPeople() {
    const params: any = { page, limit: rowsPerPage };
    if (search.trim()) params.search = search;
    if (department.trim()) params.department = department;
    const response = await api.get('/people', { params });
    setPeople(response.data.data);
    setTotal(response.data.total);
  }

  async function loadDepartments() {
    const response = await api.get('/departments');
    setDepartments(response.data);
  }

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadPeople();
  }, [page]);

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

  function openEditModal(person: Person) {
    setSelectedPerson(person);
    setEditPerson({
      firstName: person.fullName.split(' ')[0],
      lastName: person.fullName.split(' ').slice(1).join(' '),
      employeeId: person.employeeId,
      email: person.email || '',
      phone: '',
      departmentId: person.department?.id ? String(person.department.id) : '',
    });
    setEditError('');
    setOpenEdit(true);
  }

  async function handleEditPerson() {
    if (!selectedPerson) return;
    setEditError('');
    try {
      await api.patch(`/people/${selectedPerson.id}`, {
        firstName: editPerson.firstName,
        lastName: editPerson.lastName,
        fullName: `${editPerson.firstName} ${editPerson.lastName}`.trim(),
        employeeId: editPerson.employeeId,
        email: editPerson.email || undefined,
        phone: editPerson.phone || undefined,
        departmentId: editPerson.departmentId ? Number(editPerson.departmentId) : undefined,
      });
      setOpenEdit(false);
      setSelectedPerson(null);
      loadPeople();
    } catch (error: any) {
      setEditError(error?.response?.data?.message || 'Error al editar persona');
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

  function exportToExcel() {
    const rows = people.map((person) => ({
      Nombre: person.fullName,
      CUIL: person.employeeId,
      Email: person.email || '-',
      Dependencia: person.department?.name || '-',
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Personas');
    XLSX.writeFile(workbook, `personas_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`);
  }

  return (
    <AppLayout>
      <Typography variant="h4" sx={{ mb: 3 }}>Personas</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        {canEdit && (
          <Button variant="contained" onClick={() => setOpenCreate(true)}>
            Nueva persona
          </Button>
        )}
        <Button variant="outlined" onClick={exportToExcel} disabled={people.length === 0}>
          Exportar a Excel
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="Buscar por nombre o CUIL"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
        />
        <TextField select label="Dependencia" value={department}
          onChange={(e) => setDepartment(e.target.value)} fullWidth
        >
          <MenuItem value="">Todas</MenuItem>
          {departments.map((d) => (
            <MenuItem key={d.id} value={d.name}>{d.name}</MenuItem>
          ))}
        </TextField>
        <Button variant="contained" onClick={() => { setPage(0); loadPeople(); }}>
          Buscar
        </Button>
        <Button variant="outlined" onClick={() => { setSearch(''); setDepartment(''); setPage(0); }}>
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
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(person);
                        }}
                      >
                        Editar
                      </Button>
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
                    </Box>
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

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[40]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        />
      </Paper>

      {/* Modal crear */}
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
          {createError && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{createError}</Typography>}
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

      {/* Modal editar */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar persona</DialogTitle>
        <DialogContent>
          <TextField label="Nombre" fullWidth margin="normal"
            value={editPerson.firstName}
            onChange={(e) => setEditPerson({ ...editPerson, firstName: e.target.value })}
          />
          <TextField label="Apellido" fullWidth margin="normal"
            value={editPerson.lastName}
            onChange={(e) => setEditPerson({ ...editPerson, lastName: e.target.value })}
          />
          <TextField label="CUIL" fullWidth margin="normal"
            value={editPerson.employeeId}
            onChange={(e) => setEditPerson({ ...editPerson, employeeId: e.target.value })}
          />
          <TextField label="Email" fullWidth margin="normal"
            value={editPerson.email}
            onChange={(e) => setEditPerson({ ...editPerson, email: e.target.value })}
          />
          <TextField label="Teléfono" fullWidth margin="normal"
            value={editPerson.phone}
            onChange={(e) => setEditPerson({ ...editPerson, phone: e.target.value })}
          />
          <TextField select label="Dependencia" fullWidth margin="normal"
            value={editPerson.departmentId}
            onChange={(e) => setEditPerson({ ...editPerson, departmentId: e.target.value })}
          >
            <MenuItem value="">Sin dependencia</MenuItem>
            {departments.map((d) => (
              <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
            ))}
          </TextField>
          {editError && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{editError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleEditPerson}
            disabled={!editPerson.firstName || !editPerson.lastName || !editPerson.employeeId}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal eliminar */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar persona</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Confirmás que querés eliminar a <strong>{selectedPerson?.fullName}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeletePerson}>Eliminar</Button>
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