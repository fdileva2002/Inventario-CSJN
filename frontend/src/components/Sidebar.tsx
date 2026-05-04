import { useState } from 'react';
import {
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Divider,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/axios';
import { getUser, removeToken } from '../auth/auth.storage';

const menuItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Dispositivos', path: '/devices' },
  { label: 'Consumibles', path: '/consumables' },
  { label: 'Personas', path: '/people' },
  { label: 'Órdenes de compra', path: '/purchase-orders' },
  { label: 'Proveedores', path: '/suppliers' },
  { label: 'Categorías', path: '/device-categories' },
  { label: 'Dependencias', path: '/departments' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  function resetPasswordForm() {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    setPasswordSuccess('');
    setOpenChangePassword(false);
  }

  async function handleChangePassword() {
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    try {
      await api.patch(`/users/${user?.id}/password`, {
        currentPassword: passwordForm.currentPassword,
        password: passwordForm.newPassword,
      });

      setPasswordSuccess('Contraseña actualizada correctamente');
      setTimeout(() => resetPasswordForm(), 1500);
    } catch (error: any) {
      setPasswordError(
        error?.response?.data?.message || 'Error al cambiar la contraseña',
      );
    }
  }

  function handleLogout() {
    removeToken();
    navigate('/login');
  }

  return (
    <Paper sx={{ width: 260, minHeight: '100vh', borderRadius: 0, display: 'flex', flexDirection: 'column' }}>
      <List sx={{ flex: 1 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => navigate(item.path)}
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}

        {user?.role === 'EDICION' && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListItemButton onClick={() => navigate('/users')}>
              <ListItemText primary="Usuarios" />
            </ListItemButton>
          </>
        )}
      </List>

      <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
          {user?.name}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
          {user?.role}
        </Typography>
        <Button
          size="small"
          fullWidth
          variant="outlined"
          sx={{ mb: 1 }}
          onClick={() => setOpenChangePassword(true)}
        >
          Cambiar contraseña
        </Button>
        <Button
          size="small"
          fullWidth
          variant="outlined"
          color="error"
          onClick={handleLogout}
        >
          Cerrar sesión
        </Button>
      </Box>

      <Dialog open={openChangePassword} onClose={resetPasswordForm} maxWidth="xs" fullWidth>
        <DialogTitle>Cambiar contraseña</DialogTitle>
        <DialogContent>
          <TextField
            label="Contraseña actual"
            type="password"
            fullWidth
            margin="normal"
            value={passwordForm.currentPassword}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
            }
          />
          <TextField
            label="Nueva contraseña"
            type="password"
            fullWidth
            margin="normal"
            value={passwordForm.newPassword}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, newPassword: e.target.value })
            }
          />
          <TextField
            label="Confirmar nueva contraseña"
            type="password"
            fullWidth
            margin="normal"
            value={passwordForm.confirmPassword}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
            }
          />

          {passwordError && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {passwordError}
            </Typography>
          )}
          {passwordSuccess && (
            <Typography color="success.main" variant="body2" sx={{ mt: 1 }}>
              {passwordSuccess}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={resetPasswordForm}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={
              !passwordForm.currentPassword ||
              !passwordForm.newPassword ||
              !passwordForm.confirmPassword
            }
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}