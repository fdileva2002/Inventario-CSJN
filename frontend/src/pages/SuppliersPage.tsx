import { useEffect, useState } from 'react';
import {
  Box,
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
import AppLayout from '../components/AppLayout';

type Supplier = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
};

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [search, setSearch] = useState('');
    const [openCreate, setOpenCreate] = useState(false);

    const [newSupplier, setNewSupplier] = useState({
      name: '',
      email: '',
      phone: '',
    });
    const [openEdit, setOpenEdit] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    const [editSupplier, setEditSupplier] = useState({
      name: '',
      email: '',
      phone: '',
    });

  async function loadSuppliers() {
    const response = await api.get('/suppliers', {
      params: search.trim() ? { search } : {},
    });

    setSuppliers(response.data);
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  function resetCreateModal() {
    setNewSupplier({
      name: '',
      email: '',
      phone: '',
    });
    setOpenCreate(false);
  }

  async function handleCreateSupplier() {
    try {
      await api.post('/suppliers', {
        name: newSupplier.name,
        email: newSupplier.email || undefined,
        phone: newSupplier.phone || undefined,
      });

      resetCreateModal();
      loadSuppliers();
    } catch (error: any) {
      console.log(error);
      alert(error?.response?.data?.message || 'Error al crear proveedor');
    }
  }

    function openEditModal(supplier: Supplier) {
      setSelectedSupplier(supplier);
      setEditSupplier({
        name: supplier.name,
        email: supplier.email || '',
        phone: supplier.phone || '',
      });
      setOpenEdit(true);
    }

    async function handleUpdateSupplier() {
      if (!selectedSupplier) return;

      try {
        await api.patch(`/suppliers/${selectedSupplier.id}`, {
          name: editSupplier.name,
          email: editSupplier.email || undefined,
          phone: editSupplier.phone || undefined,
        });

        setOpenEdit(false);
        setSelectedSupplier(null);
        loadSuppliers();
      } catch (error: any) {
        console.log(error);
        alert(error?.response?.data?.message || 'Error al editar proveedor');
      }
    }

    async function handleDeleteSupplier(supplier: Supplier) {
      const confirmed = window.confirm(
        `¿Seguro que querés eliminar el proveedor ${supplier.name}?`,
      );

      if (!confirmed) return;

      try {
        await api.delete(`/suppliers/${supplier.id}`);
        loadSuppliers();
      } catch (error: any) {
        console.log(error);
        alert(error?.response?.data?.message || 'Error al eliminar proveedor');
      }
    }

  return (
    <AppLayout>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Proveedores
      </Typography>

      <Button
        variant="contained"
        sx={{ mb: 2 }}
        onClick={() => setOpenCreate(true)}
      >
        Nuevo proveedor
      </Button>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Buscar proveedor"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
          />

          <Button variant="contained" onClick={loadSuppliers}>
            Buscar
          </Button>

          <Button
            variant="outlined"
            onClick={() => {
              setSearch('');
            }}
          >
            Limpiar
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>CUIT</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>{supplier.name}</TableCell>
                <TableCell>{supplier.email || '-'}</TableCell>
                <TableCell>{supplier.phone || '-'}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => openEditModal(supplier)}
                  >
                    Editar
                  </Button>

                  <Button
                    size="small"
                    color="error"
                    sx={{ ml: 1 }}
                    onClick={() => handleDeleteSupplier(supplier)}
                  >
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {suppliers.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No hay proveedores para mostrar
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={openCreate} onClose={resetCreateModal} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo proveedor</DialogTitle>

        <DialogContent>
          <TextField
            label="Nombre"
            fullWidth
            margin="normal"
            value={newSupplier.name}
            onChange={(e) =>
              setNewSupplier({ ...newSupplier, name: e.target.value })
            }
          />

          <TextField
            label="Email"
            fullWidth
            margin="normal"
            value={newSupplier.email}
            onChange={(e) =>
              setNewSupplier({ ...newSupplier, email: e.target.value })
            }
          />

          <TextField
            label="CUIT"
            fullWidth
            margin="normal"
            value={newSupplier.phone}
            onChange={(e) =>
              setNewSupplier({ ...newSupplier, phone: e.target.value })
            }
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={resetCreateModal}>Cancelar</Button>

          <Button
            variant="contained"
            onClick={handleCreateSupplier}
            disabled={!newSupplier.name}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Editar proveedor</DialogTitle>
                
          <DialogContent>
            <TextField
              label="Nombre"
              fullWidth
              margin="normal"
              value={editSupplier.name}
              onChange={(e) =>
                setEditSupplier({ ...editSupplier, name: e.target.value })
              }
            />
        
            <TextField
              label="Email"
              fullWidth
              margin="normal"
              value={editSupplier.email}
              onChange={(e) =>
                setEditSupplier({ ...editSupplier, email: e.target.value })
              }
            />
        
            <TextField
              label="Teléfono"
              fullWidth
              margin="normal"
              value={editSupplier.phone}
              onChange={(e) =>
                setEditSupplier({ ...editSupplier, phone: e.target.value })
              }
            />
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setOpenEdit(false)}>Cancelar</Button>
          
            <Button
              variant="contained"
              onClick={handleUpdateSupplier}
              disabled={!editSupplier.name}
            >
              Guardar
            </Button>
          </DialogActions>
        </Dialog>
    </AppLayout>
  );
}