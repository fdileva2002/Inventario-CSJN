import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { api } from '../api/axios';
import AppLayout from '../components/AppLayout';
import { getUser } from '../auth/auth.storage';

type DeviceModel = {
  id: number;
  brand: string;
  model: string;
};

type DeviceCategory = {
  id: number;
  name: string;
  code?: string | null;
  models?: DeviceModel[];
};

export default function DeviceCategoriesPage() {
  const user = getUser();
  const canEdit = user?.role === 'EDICION';

  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);


  const [openCreateCategory, setOpenCreateCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', code: '' });
  const [categoryError, setCategoryError] = useState('');


  const [openCreateModel, setOpenCreateModel] = useState(false);
  const [newModel, setNewModel] = useState({ brand: '', model: '' });
  const [modelError, setModelError] = useState('');


  const [openDeleteModel, setOpenDeleteModel] = useState(false);
  const [selectedModel, setSelectedModel] = useState<DeviceModel | null>(null);

  const [openEditCategory, setOpenEditCategory] = useState(false);
  const [openDeleteCategory, setOpenDeleteCategory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DeviceCategory | null>(null);
  const [editCategoryForm, setEditCategoryForm] = useState({ name: '', code: '' });
  const [editCategoryError, setEditCategoryError] = useState('');

  function openEditModal(category: DeviceCategory) {
    setSelectedCategory(category);
    setEditCategoryForm({ name: category.name, code: category.code ?? '' });
    setEditCategoryError('');
    setOpenEditCategory(true);
  }

  async function handleEditCategory() {
    if (!selectedCategory) return;
    setEditCategoryError('');
    try {
      await api.patch(`/device-categories/${selectedCategory.id}`, {
        name: editCategoryForm.name,
        code: editCategoryForm.code || undefined,
      });
      setOpenEditCategory(false);
      loadCategories();
    } catch (error: any) {
      setEditCategoryError(error?.response?.data?.message || 'Error al editar categoría');
    }
  }

  async function handleDeleteCategory() {
    if (!selectedCategory) return;
    try {
      await api.delete(`/device-categories/${selectedCategory.id}`);
      setOpenDeleteCategory(false);
      setSelectedCategory(null);
      loadCategories();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al eliminar categoría');
    }
  }

  async function loadCategories() {
    const response = await api.get('/device-categories');
    const categoriesWithModels = await Promise.all(
      response.data.map(async (cat: DeviceCategory) => {
        const modelsResponse = await api.get('/device-models', {
          params: { search: cat.name },
        });
        const models = modelsResponse.data.filter(
          (m: any) => m.category?.id === cat.id,
        );
        return { ...cat, models };
      }),
    );
    setCategories(categoriesWithModels);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function toggleExpand(id: number) {
    setExpandedId(expandedId === id ? null : id);
  }


  function resetCategoryModal() {
    setNewCategory({ name: '', code: '' });
    setCategoryError('');
    setOpenCreateCategory(false);
  }

  async function handleCreateCategory() {
    setCategoryError('');
    try {
      await api.post('/device-categories', {
        name: newCategory.name,
        code: newCategory.code || undefined,
      });
      resetCategoryModal();
      loadCategories();
    } catch (error: any) {
      setCategoryError(error?.response?.data?.message || 'Error al crear categoría');
    }
  }

  function openModelModal(category: DeviceCategory) {
    setSelectedCategory(category);
    setNewModel({ brand: '', model: '' });
    setModelError('');
    setOpenCreateModel(true);
  }

  function resetModelModal() {
    setNewModel({ brand: '', model: '' });
    setModelError('');
    setOpenCreateModel(false);
    setSelectedCategory(null);
  }

  async function handleCreateModel() {
    if (!selectedCategory) return;
    setModelError('');
    try {
      await api.post('/device-models', {
        categoryId: selectedCategory.id,
        brand: newModel.brand.trim(),
        model: newModel.model.trim(),
      });
      resetModelModal();
      loadCategories();
    } catch (error: any) {
      setModelError(error?.response?.data?.message || 'Error al crear modelo');
    }
  }

  async function handleDeleteModel() {
    if (!selectedModel) return;
    try {
      await api.delete(`/device-models/${selectedModel.id}`);
      setOpenDeleteModel(false);
      setSelectedModel(null);
      loadCategories();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al eliminar modelo');
    }
  }

 
  const tagPrefixes: Record<string, string> = {
    Desktop: 'PC',
    Notebook: 'NBK',
    Monitor: 'MON',
    Impresora: 'IMP',
    Token: 'TKN',
    'All-in-one': 'AIO',
    'Camara Web': 'CAM',
    DVD: 'DVD',
    Escaner: 'SCN',
    'Colector de datos': 'COL',
  };

  return (
    <AppLayout>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Categorías y modelos
      </Typography>

      {canEdit && (
        <Button
          variant="contained"
          sx={{ mb: 2 }}
          onClick={() => setOpenCreateCategory(true)}
        >
          Nueva categoría
        </Button>
      )}

      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={40} />
              <TableCell>Categoría</TableCell>
              <TableCell>Tag</TableCell>
              <TableCell>Modelos</TableCell>
              {canEdit && <TableCell>Acciones</TableCell>}
            </TableRow>
          </TableHead>

          <TableBody>
            {categories.map((category) => (
              <>
                <TableRow
                  key={category.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => toggleExpand(category.id)}
                >
                  <TableCell>
                    <IconButton size="small">
                      {expandedId === category.id
                        ? <ExpandLessIcon />
                        : <ExpandMoreIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 'bold' }}>{category.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={category.code ?? tagPrefixes[category.name] ?? 'DEV'}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {category.models?.length ?? 0} modelos
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModelModal(category);
                          }}
                        >
                          + Modelo
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="info"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(category);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCategory(category);
                            setOpenDeleteCategory(true);
                          }}
                        >
                          Eliminar
                        </Button>
                      </Box>
                    </TableCell>
                  )}
                </TableRow>

                <TableRow key={`expand-${category.id}`}>
                  <TableCell colSpan={canEdit ? 5 : 4} sx={{ p: 0, border: 0 }}>
                    <Collapse
                      in={expandedId === category.id}
                      timeout="auto"
                      unmountOnExit
                    >
                      <Box sx={{ mx: 4, my: 1 }}>
                        {category.models && category.models.length > 0 ? (
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Marca</TableCell>
                                <TableCell>Modelo</TableCell>
                                {canEdit && <TableCell>Acciones</TableCell>}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {category.models.map((model) => (
                                <TableRow key={model.id}>
                                  <TableCell>{model.brand}</TableCell>
                                  <TableCell>{model.model}</TableCell>
                                  {canEdit && (
                                    <TableCell>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        onClick={() => {
                                          setSelectedModel(model);
                                          setOpenDeleteModel(true);
                                        }}
                                      >
                                        Eliminar
                                      </Button>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ py: 1 }}
                          >
                            Sin modelos cargados
                          </Typography>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </>
            ))}

            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 5 : 4} align="center">
                  No hay categorías
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>


      <Dialog open={openCreateCategory} onClose={resetCategoryModal} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva categoría</DialogTitle>
        <DialogContent>
          <TextField
            label="Nombre"
            fullWidth
            margin="normal"
            value={newCategory.name}
            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
          />
          <TextField
            label="Código de tag (ej: NBK, PC, SCN)"
            fullWidth
            margin="normal"
            value={newCategory.code}
            onChange={(e) =>
              setNewCategory({ ...newCategory, code: e.target.value.toUpperCase() })
            }
          />
          <Typography variant="caption" color="text.secondary">
            El código de tag se usa para generar automáticamente la etiqueta del dispositivo. 
            Ejemplo: NBK → NBK0001, NBK0002...
          </Typography>
          {categoryError && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {categoryError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={resetCategoryModal}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCreateCategory}
            disabled={!newCategory.name}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>


      <Dialog open={openCreateModel} onClose={resetModelModal} maxWidth="xs" fullWidth>
        <DialogTitle>
          Nuevo modelo — {selectedCategory?.name}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Marca"
            fullWidth
            margin="normal"
            value={newModel.brand}
            onChange={(e) => setNewModel({ ...newModel, brand: e.target.value })}
          />
          <TextField
            label="Modelo"
            fullWidth
            margin="normal"
            value={newModel.model}
            onChange={(e) => setNewModel({ ...newModel, model: e.target.value })}
          />
          {modelError && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {modelError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={resetModelModal}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCreateModel}
            disabled={!newModel.brand || !newModel.model}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>


      <Dialog open={openDeleteModel} onClose={() => setOpenDeleteModel(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar modelo</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Confirmás que querés eliminar el modelo{' '}
            <strong>{selectedModel?.brand} {selectedModel?.model}</strong>?
            No se puede eliminar si tiene dispositivos asociados.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteModel(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeleteModel}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEditCategory} onClose={() => setOpenEditCategory(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Editar categoría</DialogTitle>
        <DialogContent>
          <TextField
            label="Nombre"
            fullWidth
            margin="normal"
            value={editCategoryForm.name}
            onChange={(e) => setEditCategoryForm({ ...editCategoryForm, name: e.target.value })}
          />
          <TextField
            label="Código de tag (ej: NBK, PC)"
            fullWidth
            margin="normal"
            value={editCategoryForm.code}
            onChange={(e) =>
              setEditCategoryForm({ ...editCategoryForm, code: e.target.value.toUpperCase() })
            }
          />
          {editCategoryError && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {editCategoryError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditCategory(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleEditCategory}
            disabled={!editCategoryForm.name}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
        

      <Dialog open={openDeleteCategory} onClose={() => setOpenDeleteCategory(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar categoría</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Confirmás que querés eliminar la categoría{' '}
            <strong>{selectedCategory?.name}</strong>?
            No se puede eliminar si tiene modelos o dispositivos asociados.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteCategory(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeleteCategory}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}