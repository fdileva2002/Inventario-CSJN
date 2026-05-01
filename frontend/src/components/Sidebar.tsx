import { List, ListItemButton, ListItemText, Paper } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';

const menuItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Dispositivos', path: '/devices' },
  { label: 'Consumibles', path: '/consumables' },
  { label: 'Personas', path: '/people' },
  { label: 'Órdenes de compra', path: '/purchase-orders' },
  { label: 'Proveedores', path: '/suppliers' },
  { label: 'Categorías', path: '/device-categories' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Paper sx={{ width: 260, minHeight: '100vh', borderRadius: 0 }}>
      <List>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => navigate(item.path)}
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
}