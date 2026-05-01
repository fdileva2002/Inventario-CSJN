import type { ReactNode } from 'react';
import {
  AppBar,
  Box,
  Button,
  Toolbar,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { removeToken } from '../auth/auth.storage';

type Props = {
  children: ReactNode;
};

export default function AppLayout({ children }: Props) {
  const navigate = useNavigate();

  function handleLogout() {
    removeToken();
    navigate('/login');
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <Box sx={{ flex: 1 }}>
        <AppBar position="static">
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">Inventario Sistemas CSJN</Typography>
            <Button color="inherit" onClick={handleLogout}>
              Salir
            </Button>
          </Toolbar>
        </AppBar>

        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}