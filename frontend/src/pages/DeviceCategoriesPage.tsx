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

type DeviceCategory = {
  id: number;
  name: string;
  code?: string | null;
};

export default function DeviceCategoriesPage() {
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [openCreate, setOpenCreate] = useState(false);

  const [newCategory, setNewCategory] = useState({
    name: '',
    code: '',
  });

  async function loadCategories() {
    const response = await api.get('/device-categories');
    setCategories(response.data);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function resetCreateModal() {
    setNewCategory({
      name: '',
      code: '',
    });

    setOpenCreate(false);
  }

  async function handleCreateCategory() {
    try {
      await api.post('/device-categories', {
        name: newCategory.name,
        code: newCategory.code || undefined,
      });

      resetCreateModal();
      loadCategories();
    } catch (error: any) {
      console.log(error);
      alert(error?.response?.data?.message || 'Error al crear categoría');
    }
  }

  return (
    <AppLayout>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Categorías de dispositivos
      </Typography>

      <Button
        variant="contained"
        sx={{ mb: 2 }}
        onClick={() => setOpenCreate(true)}
      >
        Nueva categoría
      </Button>

      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Codigo</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>{category.name}</TableCell>
                <TableCell>{category.code || '-'}</TableCell>
              </TableRow>
            ))}

            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} align="center">
                  No hay categorías
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog
        open={openCreate}
        onClose={resetCreateModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nueva categoría</DialogTitle>

        <DialogContent>
          <TextField
            label="Nombre"
            fullWidth
            margin="normal"
            value={newCategory.name}
            onChange={(e) =>
              setNewCategory({ ...newCategory, name: e.target.value })
            }
          />

          <TextField
              label="Código (ej: NBK, PC, SCN)"
              fullWidth
              margin="normal"
              value={newCategory.code}
              onChange={(e) =>
                setNewCategory({
                  ...newCategory,
                  code: e.target.value.toUpperCase(),
                })
              }
            />
        </DialogContent>

        <DialogActions>
          <Button onClick={resetCreateModal}>Cancelar</Button>

          <Button
            variant="contained"
            onClick={handleCreateCategory}
            disabled={!newCategory.name}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}