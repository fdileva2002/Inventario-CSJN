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
  Chip,
  MenuItem,
} from '@mui/material';
import { api } from '../api/axios';
import AppLayout from '../components/AppLayout';
import { getUser } from '../auth/auth.storage';

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

export default function UsersPage() {
  const currentUser = getUser();
  const [users, setUsers] = useState<User[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openResetConfirm, setOpenResetConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [resetMessage, setResetMessage] = useState('');

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CONSULTA',
  });
  const [createError, setCreateError] = useState('');

  async function loadUsers() {
    const response = await api.get('/users');
    setUsers(response.data);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreateUser() {
    setCreateError('');
    try {
      await api.post('/users', newUser);
      setOpenCreate(false);
      setNewUser({ name: '', email: '', password: '', role: 'CONSULTA' });
      loadUsers();
    } catch (error: any) {
      setCreateError(error?.response?.data?.message || 'Error al crear usuario');
    }
  }

  async function handleResetPassword() {
    if (!selectedUser) return;
    try {
      const response = await api.patch(`/users/${selectedUser.id}/reset-password`);
      setResetMessage(response.data.message);
    } catch (error: any) {
      setResetMessage(error?.response?.data?.message || 'Error al resetear contraseña');
    }
  }

  async function handleToggleActive(user: User) {
    try {
      await api.patch(`/users/${user.id}`, { active: !user.active });
      loadUsers();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al actualizar usuario');
    }
  }

  function openReset(user: User) {
    setSelectedUser(user);
    setResetMessage('');
    setOpenResetConfirm(true);
  }

  return (
    <AppLayout>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Usuarios
      </Typography>

      <Button variant="contained" sx={{ mb: 2 }} onClick={() => setOpenCreate(true)}>
        Nuevo usuario
      </Button>

      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  <Chip
                    label={user.active ? 'Activo' : 'Inactivo'}
                    color={user.active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {user.id !== currentUser?.id && (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          onClick={() => openReset(user)}
                        >
                          Blanquear contraseña
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color={user.active ? 'error' : 'success'}
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.active ? 'Desactivar' : 'Activar'}
                        </Button>
                      </>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nuevo usuario</DialogTitle>
        <DialogContent>
          <TextField
            label="Nombre"
            fullWidth
            margin="normal"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
          />
          <TextField
            label="Email"
            fullWidth
            margin="normal"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          />
          <TextField
            label="Contraseña inicial"
            type="password"
            fullWidth
            margin="normal"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          />
          <TextField
            select
            label="Rol"
            fullWidth
            margin="normal"
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            <MenuItem value="EDICION">Edición</MenuItem>
            <MenuItem value="CONSULTA">Consulta</MenuItem>
          </TextField>

          {createError && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {createError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCreateUser}
            disabled={!newUser.name || !newUser.email || !newUser.password}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>


      <Dialog open={openResetConfirm} onClose={() => setOpenResetConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Blanquear contraseña</DialogTitle>
        <DialogContent>
          {!resetMessage ? (
            <Typography>
              ¿Confirmás que querés blanquear la contraseña de{' '}
              <strong>{selectedUser?.name}</strong>? Se asignará una contraseña
              temporal.
            </Typography>
          ) : (
            <Typography color="success.main">{resetMessage}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResetConfirm(false)}>Cerrar</Button>
          {!resetMessage && (
            <Button variant="contained" color="warning" onClick={handleResetPassword}>
              Confirmar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}