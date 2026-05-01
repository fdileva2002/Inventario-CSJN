import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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

type Person = {
  id: number;
  fullName: string;
  employeeId: string;
  email?: string;
  department?: string;
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
    model?: {
      brand: string;
      model: string;
    };
    status?: {
      name: string;
    };
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
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [deviceAssignments, setDeviceAssignments] = useState<DeviceAssignment[]>([]);
  const [consumableAssignments, setConsumableAssignments] = useState<ConsumableAssignment[]>([]);

  const [newPerson, setNewPerson] = useState({
    firstName: '',
    lastName: '',
    employeeId: '',
    email: '',
    phone: '',
    department: '',
  });

  async function loadPeople() {
  const params: any = {};

  if (search.trim() !== '') {
    params.search = search;
  }

  if (department.trim() !== '') {
    params.department = department;
  }

  const response = await api.get('/people', { params });

  setPeople(response.data);
}

  useEffect(() => {
    loadPeople();
  }, []);

  async function handleCreatePerson() {
    try {
      await api.post('/people', {
        firstName: newPerson.firstName,
        lastName: newPerson.lastName,
        fullName: `${newPerson.firstName} ${newPerson.lastName}`.trim(),
        employeeId: newPerson.employeeId,
        email: newPerson.email || undefined,
        phone: newPerson.phone || undefined,
        department: newPerson.department || undefined,
      });

      resetCreatePersonModal();
      loadPeople();
    } catch (error: any) {
      console.log(error);
      alert(error?.response?.data?.message || 'Error al crear persona');
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

  function resetCreatePersonModal() {
    setNewPerson({
      firstName: '',
      lastName: '',
      employeeId: '',
      email: '',
      phone: '',
      department: '',
    });

    setOpenCreate(false);
  }

  return (
    <AppLayout>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Personas
      </Typography>

      <Button
        variant="contained"
        sx={{ mb: 2 }}
        onClick={() => setOpenCreate(true)}
      >
        Nueva persona
      </Button>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="Buscar por nombre o CUIL"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
        />

        <TextField
          label="Dependencia"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          fullWidth
        />

        <Button variant="contained" onClick={loadPeople}>
          Buscar
        </Button>

        <Button
          variant="outlined"
          onClick={() => {
            setSearch('');
            setDepartment('');
          }}
        >
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
                <TableCell>{person.department || '-'}</TableCell>
              </TableRow>
            ))}

            {people.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No hay personas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={openCreate} onClose={resetCreatePersonModal} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva persona</DialogTitle>
                
        <DialogContent>
          <TextField
            label="Nombre"
            fullWidth
            margin="normal"
            value={newPerson.firstName}
            onChange={(e) =>
              setNewPerson({ ...newPerson, firstName: e.target.value })
            }
          />
      
          <TextField
            label="Apellido"
            fullWidth
            margin="normal"
            value={newPerson.lastName}
            onChange={(e) =>
              setNewPerson({ ...newPerson, lastName: e.target.value })
            }
          />
      
          <TextField
            label="CUIL"
            fullWidth
            margin="normal"
            value={newPerson.employeeId}
            onChange={(e) =>
              setNewPerson({ ...newPerson, employeeId: e.target.value })
            }
          />
      
          <TextField
            label="Email"
            fullWidth
            margin="normal"
            value={newPerson.email}
            onChange={(e) =>
              setNewPerson({ ...newPerson, email: e.target.value })
            }
          />
      
          <TextField
            label="Teléfono"
            fullWidth
            margin="normal"
            value={newPerson.phone}
            onChange={(e) =>
              setNewPerson({ ...newPerson, phone: e.target.value })
            }
          />
      
          <TextField
            label="Dependencia"
            fullWidth
            margin="normal"
            value={newPerson.department}
            onChange={(e) =>
              setNewPerson({ ...newPerson, department: e.target.value })
            }
          />
        </DialogContent>
          
        <DialogActions>
          <Button onClick={resetCreatePersonModal}>Cancelar</Button>
          
          <Button
            variant="contained"
            onClick={handleCreatePerson}
            disabled={
              !newPerson.firstName ||
              !newPerson.lastName ||
              !newPerson.employeeId
            }
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Detalle de persona</DialogTitle>

        <DialogContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {selectedPerson?.fullName}
          </Typography>

          <Typography sx={{ mb: 3 }}>
            CUIL: {selectedPerson?.employeeId} | Área: {selectedPerson?.department || '-'}
          </Typography>

          <Typography variant="h6" sx={{ mb: 1 }}>
            Dispositivos asignados
          </Typography>

          <Table size="small" sx={{ mb: 4 }}>
            <TableHead>
              <TableRow>
                <TableCell>Tag</TableCell>
                <TableCell>Hostname</TableCell>
                <TableCell>Modelo</TableCell>
                <TableCell>Estado asignación</TableCell>
                <TableCell>Fecha asignación</TableCell>
                <TableCell>Fecha devolución</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {deviceAssignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>{assignment.device.tag}</TableCell>
                  <TableCell>{assignment.device.hostname || '-'}</TableCell>
                  <TableCell>
                    {assignment.device.model
                      ? `${assignment.device.model.brand} ${assignment.device.model.model}`
                      : '-'}
                  </TableCell>
                  <TableCell>{assignment.status}</TableCell>
                  <TableCell>
                    {new Date(assignment.assignedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {assignment.returnedAt
                      ? new Date(assignment.returnedAt).toLocaleString()
                      : 'Activo'}
                  </TableCell>
                </TableRow>
              ))}

              {deviceAssignments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Sin dispositivos asignados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
            
          <Typography variant="h6" sx={{ mb: 1 }}>
            Consumibles entregados
          </Typography>
            
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
              {consumableAssignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    {assignment.consumable.name} {assignment.consumable.model}
                    {assignment.consumable.variant
                      ? ` - ${assignment.consumable.variant}`
                      : ''}
                  </TableCell>
                  <TableCell>{assignment.quantity}</TableCell>
                  <TableCell>
                    {new Date(assignment.assignedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{assignment.notes || '-'}</TableCell>
                </TableRow>
              ))}

              {consumableAssignments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Sin consumibles entregados
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