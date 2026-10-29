import { useEffect, useState, type ReactNode } from 'react';
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { api } from '../api/axios';
import { getUser, removeToken, saveUser } from '../auth/auth.storage';

type Props = {
  children: ReactNode;
};

const SIDEBAR_WIDTH = 260;

export default function AppLayout({ children }: Props) {
  const navigate = useNavigate();
  const theme = useTheme();
  // En pantallas grandes el menú queda fijo; en celulares y tablets se abre con el botón.
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [menuOpen, setMenuOpen] = useState(false);

  // El rol guardado al loguearse puede haber cambiado (o ser un rol que ya no existe):
  // se refresca desde el backend y, si cambió, se recarga para mostrar los permisos vigentes.
  useEffect(() => {
    api.get('/auth/me').then((response) => {
      const stored = getUser();
      saveUser({ ...stored, ...response.data });
      if (stored?.role !== response.data.role) window.location.reload();
    }).catch(() => undefined);
  }, []);

  function handleLogout() {
    removeToken();
    navigate('/login');
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {isDesktop ? (
        <Box
          component="nav"
          sx={{
            width: SIDEBAR_WIDTH,
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
      ) : (
        <Drawer
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          ModalProps={{ keepMounted: true }}
        >
          <Sidebar onNavigate={() => setMenuOpen(false)} />
        </Drawer>
      )}

      <Box sx={{ flex: 1, minWidth: 0, ml: isDesktop ? `${SIDEBAR_WIDTH}px` : 0 }}>
        <AppBar position="sticky" sx={{ top: 0, zIndex: 99 }}>
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              {!isDesktop && (
                <IconButton
                  color="inherit"
                  edge="start"
                  aria-label="Abrir menú"
                  onClick={() => setMenuOpen(true)}
                >
                  <Box component="span" sx={{ fontSize: 26, lineHeight: 1 }}>
                    ☰
                  </Box>
                </IconButton>
              )}
              <Typography variant="h6" noWrap>
                Inventario Sistemas CSJN
              </Typography>
            </Box>
            <Button color="inherit" onClick={handleLogout}>
              Salir
            </Button>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
