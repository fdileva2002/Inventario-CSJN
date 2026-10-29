import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { getPermissions } from '../auth/permissions';
import AppLayout from '../components/AppLayout';

type Department = {
  id: number;
  name: string;
  active: boolean;
};

export default function DepartmentsPage() {
  const { canLoad: canEdit, canDelete } = getPermissions();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState('');

  async function loadDepartments() {
    const response = await api.get('/departments');
    setDepartments(response.data);
  }

  useEffect(() => {
    loadDepartments();
  }, []);

  function resetCreateModal() {
    setNewName('');
    setCreateError('');
    setOpenCreate(false);
  }

  async function handleCreate() {
    setCreateError('');
    try {
      await api.post('/departments', { name: newName });
      resetCreateModal();
      loadDepartments();
    } catch (error: any) {
      setCreateError(error?.response?.data?.message || 'Error al crear dependencia');
    }
  }

  async function handleDelete() {
    if (!selectedDepartment) return;
    try {
      await api.delete(`/departments/${selectedDepartment.id}`);
      setOpenDelete(false);
      setSelectedDepartment(null);
      loadDepartments();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al eliminar dependencia');
    }
  }

  return (
    <AppLayout>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Dependencias
      </Typography>

      {canEdit && (
        <Button
          variant="contained"
          sx={{ mb: 2 }}
          onClick={() => setOpenCreate(true)}
        >
          Nueva dependencia
        </Button>
      )}

      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {departments.map((dept) => (
              <TableRow key={dept.id}>
                <TableCell>{dept.name}</TableCell>
                <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ mr: 1 }}
                      onClick={() => navigate(`/movements?kind=DEVICE&departmentId=${dept.id}`)}
                    >
                      Ver movimientos
                    </Button>
                    {canDelete && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => {
                          setSelectedDepartment(dept);
                          setOpenDelete(true);
                        }}
                      >
                        Eliminar
                      </Button>
                    )}
                </TableCell>
              </TableRow>
            ))}

            {departments.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} align="center">
                  No hay dependencias cargadas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Modal crear */}
      <Dialog open={openCreate} onClose={resetCreateModal} maxWidth="xs" fullWidth>
        <DialogTitle>Nueva dependencia</DialogTitle>
        <DialogContent>
          <TextField
            label="Nombre"
            fullWidth
            margin="normal"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) handleCreate();
            }}
          />
          {createError && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {createError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={resetCreateModal}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newName.trim()}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal confirmar eliminar */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar dependencia</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Confirmás que querés eliminar{' '}
            <strong>{selectedDepartment?.name}</strong>?
            No se puede eliminar si tiene personas asociadas.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancelar</Button>
          {canDelete && (
            <Button variant="contained" color="error" onClick={handleDelete}>
              Eliminar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}