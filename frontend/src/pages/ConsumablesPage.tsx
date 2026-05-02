import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  FormControlLabel,
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
import { getUser } from '../auth/auth.storage';

type Consumable = {
  id: number;
  name: string;
  brand?: string | null;
  model: string;
  variant?: string | null;
  minimumStock: number;
  unitMeasure?: string | null;
  active: boolean;
  stock?: {
    currentStock: number;
  } | null;
};

type Person = {
  id: number;
  fullName: string;
  employeeId: string;
};

type ConsumableMovement = {
  id: number;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  detail?: string | null;
  date: string;
};

export default function ConsumablesPage() {
    const [consumables, setConsumables] = useState<Consumable[]>([]);
    const [search, setSearch] = useState('');
    const [belowMinimum, setBelowMinimum] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [openMovement, setOpenMovement] = useState(false);
    const [selectedConsumable, setSelectedConsumable] = useState<Consumable | null>(null);
    

    const [movementForm, setMovementForm] = useState({
      type: 'AJUSTE_POSITIVO',
      quantity: '',
      detail: '',
    });

    const [newConsumable, setNewConsumable] = useState({
      name: '',
      brand: '',
      model: '',
      variant: '',
      minimumStock: '',
      unitMeasure: 'unidad',
    });
    const [openAssign, setOpenAssign] = useState(false);
    const [selectedConsumableAssign, setSelectedConsumableAssign] = useState<Consumable | null>(null);

    const [assignForm, setAssignForm] = useState({
      personId: '',
      quantity: '',
      detail: '',
    });
    const [people, setPeople] = useState<Person[]>([]);
    const [openHistory, setOpenHistory] = useState(false);
    const [selectedConsumableHistory, setSelectedConsumableHistory] =
      useState<Consumable | null>(null);
    const [movements, setMovements] = useState<ConsumableMovement[]>([]);
    const user = getUser();
    const canEdit = user?.role === 'EDICION';
    const [openDelete, setOpenDelete] = useState(false);

  async function loadConsumables() {
    const params: any = {};

    if (search.trim() !== '') {
      params.search = search;
    }

    if (belowMinimum) {
      params.belowMinimum = true;
    }

    const response = await api.get('/consumables', { params });
    setConsumables(response.data);
  }

  useEffect(() => {
    loadConsumables();
    loadPeople();
  }, []);

  function clearFilters() {
    setSearch('');
    setBelowMinimum(false);
  }

  async function handleCreateConsumable() {
  await api.post('/consumables', {
    name: newConsumable.name,
    brand: newConsumable.brand,
    model: newConsumable.model,
    variant: newConsumable.variant,
    minimumStock: Number(newConsumable.minimumStock || 0),
    unitMeasure: newConsumable.unitMeasure,
  });

  setOpenCreate(false);

  setNewConsumable({
    name: '',
    brand: '',
    model: '',
    variant: '',
    minimumStock: '',
    unitMeasure: 'unidad',
  });

  loadConsumables();
}

    function openMovementModal(consumable: Consumable) {
      setSelectedConsumable(consumable);
      setMovementForm({
        type: 'AJUSTE_POSITIVO',
        quantity: '',
        detail: '',
      });
      setOpenMovement(true);
    }

    async function handleCreateMovement() {
      if (!selectedConsumable) return;
        
      try {
        await api.post('/consumable-movements', {
          consumableId: selectedConsumable.id,
          type: movementForm.type,
          quantity: Number(movementForm.quantity),
          detail: movementForm.detail,
        });
      
        setOpenMovement(false);
        setSelectedConsumable(null);
        setMovementForm({
          type: 'AJUSTE_POSITIVO',
          quantity: '',
          detail: '',
        });
      
        loadConsumables();
      } catch (error: any) {
        alert(error?.response?.data?.message || 'Error al registrar movimiento');
      }
    }

    async function loadPeople() {
      const response = await api.get('/people');
      setPeople(response.data);
    }

    function openAssignModal(consumable: Consumable) {
      setSelectedConsumableAssign(consumable);
      setAssignForm({
        personId: '',
        quantity: '',
        detail: '',
      });
      setOpenAssign(true);
    }

    async function handleAssignConsumable() {
      if (!selectedConsumableAssign) return;

      try {
        await api.post('/consumable-assignments', {
          consumableId: selectedConsumableAssign.id,
          personId: Number(assignForm.personId),
          quantity: Number(assignForm.quantity),
          notes: assignForm.detail,
        });

        setOpenAssign(false);
        setSelectedConsumableAssign(null);
        setAssignForm({
          personId: '',
          quantity: '',
          detail: '',
        });

        loadConsumables();
      } catch (error: any) {
        console.log(error);
        alert(error?.response?.data?.message || 'Error al asignar consumible');
      }
    }

    async function openHistoryModal(consumable: Consumable) {
      setSelectedConsumableHistory(consumable);
      setOpenHistory(true);

      const response = await api.get('/consumable-movements', {
        params: {
          consumableId: consumable.id,
        },
      });

      setMovements(response.data);
    }

  
  function resetCreateConsumableModal() {
    setNewConsumable({
      name: '',
      brand: '',
      model: '',
      variant: '',
      minimumStock: '',
      unitMeasure: 'unidad',
    });
    setOpenCreate(false);
  }

  async function handleDeleteConsumable() {
    if (!selectedConsumable) return;
    try {
      await api.delete(`/consumables/${selectedConsumable.id}`);
      setOpenDelete(false);
      setSelectedConsumable(null);
      loadConsumables();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al eliminar consumible');
    }
  }
  return (
    <AppLayout>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Consumibles
      </Typography>

        {canEdit && (
          <Button variant="contained" sx={{ mb: 2 }} onClick={() => setOpenCreate(true)}>
            Nuevo consumible
          </Button>
        )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Filtros
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Buscar por nombre, marca, modelo o variante"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={belowMinimum}
                onChange={(e) => setBelowMinimum(e.target.checked)}
              />
            }
            label="Stock bajo"
          />

          <Button variant="contained" onClick={loadConsumables}>
            Buscar
          </Button>

          <Button variant="outlined" onClick={clearFilters}>
            Limpiar
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Marca</TableCell>
              <TableCell>Modelo</TableCell>
              <TableCell>Variante</TableCell>
              <TableCell>Stock actual</TableCell>
              <TableCell>Stock mínimo</TableCell>
              <TableCell>Unidad</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {consumables.map((consumable) => {
              const currentStock = consumable.stock?.currentStock ?? 0;
              const isLowStock = currentStock <= consumable.minimumStock;

              return (
                <TableRow
                  key={consumable.id}
                  hover
                  onDoubleClick={() => openHistoryModal(consumable)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{consumable.name}</TableCell>
                  <TableCell>{consumable.brand || '-'}</TableCell>
                  <TableCell>{consumable.model}</TableCell>
                  <TableCell>{consumable.variant || '-'}</TableCell>
                  <TableCell>{currentStock}</TableCell>
                  <TableCell>{consumable.minimumStock}</TableCell>
                  <TableCell>{consumable.unitMeasure || '-'}</TableCell>
                  <TableCell>
                    {isLowStock ? 'Stock bajo' : 'Stock OK'}
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {canEdit && (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => openMovementModal(consumable)}
                          >
                            Ajustar stock
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => openAssignModal(consumable)}
                          >
                            Asignar
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConsumable(consumable);
                              setOpenDelete(true);
                            }}
                          >
                            Eliminar
                          </Button>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}

            {consumables.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No hay consumibles para mostrar
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
            <Dialog
              open={openCreate}
              onClose={resetCreateConsumableModal}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>Nuevo consumible</DialogTitle>

              <DialogContent>
                <TextField
                  label="Nombre"
                  fullWidth
                  margin="normal"
                  value={newConsumable.name}
                  onChange={(e) =>
                    setNewConsumable({ ...newConsumable, name: e.target.value })
                  }
                />

                <TextField
                  label="Marca"
                  fullWidth
                  margin="normal"
                  value={newConsumable.brand}
                  onChange={(e) =>
                    setNewConsumable({ ...newConsumable, brand: e.target.value })
                  }
                />

                <TextField
                  label="Modelo"
                  fullWidth
                  margin="normal"
                  value={newConsumable.model}
                  onChange={(e) =>
                    setNewConsumable({ ...newConsumable, model: e.target.value })
                  }
                />

                <TextField
                  label="Variante"
                  fullWidth
                  margin="normal"
                  value={newConsumable.variant}
                  onChange={(e) =>
                    setNewConsumable({ ...newConsumable, variant: e.target.value })
                  }
                />

                <TextField
                  label="Stock mínimo"
                  type="number"
                  fullWidth
                  margin="normal"
                  value={newConsumable.minimumStock}
                  onChange={(e) =>
                    setNewConsumable({ ...newConsumable, minimumStock: e.target.value })
                  }
                />

                <TextField
                  select
                  label="Unidad de medida"
                  fullWidth
                  margin="normal"
                  value={newConsumable.unitMeasure}
                  onChange={(e) =>
                    setNewConsumable({ ...newConsumable, unitMeasure: e.target.value })
                  }
                >
                  <MenuItem value="unidad">Unidad</MenuItem>
                  <MenuItem value="caja">Caja</MenuItem>
                  <MenuItem value="pack">Pack</MenuItem>
                </TextField>
              </DialogContent>
              
              <DialogActions>
                <Button onClick={resetCreateConsumableModal}>Cancelar</Button>
                <Button
                  variant="contained"
                  onClick={handleCreateConsumable}
                  disabled={!newConsumable.name || !newConsumable.model}
                >
                  Crear
                </Button>
              </DialogActions>
            </Dialog>


            <Dialog
              open={openMovement}
              onClose={() => setOpenMovement(false)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>Ajustar stock</DialogTitle>

              <DialogContent>
                <Typography sx={{ mb: 2 }}>
                  {selectedConsumable
                    ? `${selectedConsumable.name} ${selectedConsumable.model}`
                    : ''}
                </Typography>
                
                <TextField
                  select
                  label="Tipo de movimiento"
                  fullWidth
                  margin="normal"
                  value={movementForm.type}
                  onChange={(e) =>
                    setMovementForm({ ...movementForm, type: e.target.value })
                  }
                >
                  <MenuItem value="AJUSTE_POSITIVO">Sumar stock</MenuItem>
                  <MenuItem value="AJUSTE_NEGATIVO">Restar stock</MenuItem>
                </TextField>
              
                <TextField
                  label="Cantidad"
                  type="number"
                  fullWidth
                  margin="normal"
                  value={movementForm.quantity}
                  onChange={(e) =>
                    setMovementForm({ ...movementForm, quantity: e.target.value })
                  }
                />

                <TextField
                  label="Motivo / detalle"
                  fullWidth
                  margin="normal"
                  multiline
                  rows={3}
                  value={movementForm.detail}
                  onChange={(e) =>
                    setMovementForm({ ...movementForm, detail: e.target.value })
                  }
                />
              </DialogContent>
              
              <DialogActions>
                <Button onClick={() => setOpenMovement(false)}>Cancelar</Button>
              
                <Button
                  variant="contained"
                  onClick={handleCreateMovement}
                  disabled={!movementForm.quantity}
                >
                  Guardar movimiento
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog
              open={openAssign}
              onClose={() => setOpenAssign(false)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>Asignar consumible</DialogTitle>

              <DialogContent>
                <Typography sx={{ mb: 2 }}>
                  {selectedConsumableAssign
                    ? `${selectedConsumableAssign.name} ${selectedConsumableAssign.model}`
                    : ''}
                </Typography>
                
                <TextField
                  select
                  label="Persona"
                  fullWidth
                  margin="normal"
                  value={assignForm.personId}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, personId: e.target.value })
                  }
                >
                  {people.map((person) => (
                    <MenuItem key={person.id} value={person.id}>
                      {person.fullName} - {person.employeeId}
                    </MenuItem>
                  ))}
                </TextField>
              
                <TextField
                  label="Cantidad"
                  type="number"
                  fullWidth
                  margin="normal"
                  value={assignForm.quantity}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, quantity: e.target.value })
                  }
                />

                <TextField
                  label="Motivo / detalle"
                  fullWidth
                  margin="normal"
                  multiline
                  rows={3}
                  value={assignForm.detail}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, detail: e.target.value })
                  }
                />
              </DialogContent>
              
              <DialogActions>
                <Button onClick={() => setOpenAssign(false)}>Cancelar</Button>
              
                <Button
                  variant="contained"
                  onClick={handleAssignConsumable}
                  disabled={!assignForm.personId || !assignForm.quantity}
                >
                  Asignar
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog
              open={openHistory}
              onClose={() => setOpenHistory(false)}
              maxWidth="md"
              fullWidth
            >
              <DialogTitle>Historial de consumible</DialogTitle>
                        
              <DialogContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {selectedConsumableHistory
                    ? `${selectedConsumableHistory.name} ${selectedConsumableHistory.model}`
                    : ''}
                </Typography>
                
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Cantidad</TableCell>
                      <TableCell>Stock anterior</TableCell>
                      <TableCell>Stock nuevo</TableCell>
                      <TableCell>Detalle</TableCell>
                    </TableRow>
                  </TableHead>
                
                  <TableBody>
                    {movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>
                          {new Date(movement.date).toLocaleString()}
                        </TableCell>
                        <TableCell>{movement.type}</TableCell>
                        <TableCell>{movement.quantity}</TableCell>
                        <TableCell>{movement.previousStock}</TableCell>
                        <TableCell>{movement.newStock}</TableCell>
                        <TableCell>{movement.detail || '-'}</TableCell>
                      </TableRow>
                    ))}
            
                    {movements.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          Sin movimientos
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </DialogContent>
                
              <DialogActions>
                <Button onClick={() => setOpenHistory(false)}>Cerrar</Button>
              </DialogActions>
            </Dialog>

            <Dialog open={openDelete} onClose={() => setOpenDelete(false)} maxWidth="xs" fullWidth>
              <DialogTitle>Eliminar consumible</DialogTitle>
              <DialogContent>
                <Typography>
                  ¿Confirmás que querés eliminar{' '}
                  <strong>
                    {selectedConsumable?.name} {selectedConsumable?.model}
                  </strong>?
                  Esta acción no se puede deshacer.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenDelete(false)}>Cancelar</Button>
                <Button variant="contained" color="error" onClick={handleDeleteConsumable}>
                  Eliminar
                </Button>
              </DialogActions>
            </Dialog>
    </AppLayout>
  );
}