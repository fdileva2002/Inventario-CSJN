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
        <Box
          sx={{
            width: 260,
            flexShrink: 0,
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            overflowY: 'auto',
            zIndex: 100,
          }}
        >
          <Sidebar />
        </Box>
        
        <Box sx={{ flex: 1, ml: '260px' }}>
          <AppBar position="sticky" sx={{ top: 0, zIndex: 99 }}>
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