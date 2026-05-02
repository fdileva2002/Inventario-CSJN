import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { loginRequest } from '../auth/auth.service';
import { saveToken, saveUser } from '../auth/auth.storage';

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [openForgot, setOpenForgot] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginRequest({ email, password });
      saveToken(data.accessToken);
      saveUser(data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <Paper sx={{ p: 4, width: '100%' }}>
          <Typography variant="h4" sx={{ mb: 3 }}>
            Inventario Sistemas CSJN
          </Typography>

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Email"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <TextField
              label="Contraseña"
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <Typography color="error" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 3 }}
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>

            <Button
              fullWidth
              sx={{ mt: 1 }}
              onClick={() => setOpenForgot(true)}
            >
              Olvidé mi contraseña
            </Button>
          </Box>
        </Paper>
      </Box>

      <Dialog open={openForgot} onClose={() => setOpenForgot(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Olvidé mi contraseña</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>
            Este sistema no tiene recuperación automática de contraseña.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Contactá al administrador del sistema para que blanquee tu contraseña
            desde el panel de usuarios.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForgot(false)}>Entendido</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}