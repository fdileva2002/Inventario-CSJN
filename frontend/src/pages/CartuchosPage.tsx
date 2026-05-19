import { useEffect, useState } from 'react';
import {
  Autocomplete,
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
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';
import { api } from '../api/axios';
import AppLayout from '../components/AppLayout';
import { getUser } from '../auth/auth.storage';
import * as XLSX from 'xlsx';

type Consumable = {
  id: number;
  name: string;
  brand?: string | null;
  model: string;
  variant?: string | null;
  minimumStock: number;
  unitMeasure?: string | null;
  active: boolean;
  stock?: { currentStock: number } | null;
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

export default function CartuchosPage() {
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
    departmentId: '',
    quantity: '',
    detail: '',
  });

  const [openHistory, setOpenHistory] = useState(false);
  const [selectedConsumableHistory, setSelectedConsumableHistory] = useState<Consumable | null>(null);
  const [movements, setMovements] = useState<ConsumableMovement[]>([]);

  const user = getUser();
  const canEdit = user?.role === 'EDICION';

  const [openDelete, setOpenDelete] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const rowsPerPage = 40;
  const [personSearch, setPersonSearch] = useState('');
  const [filteredPeople, setFilteredPeople] = useState<Person[]>([]);
  const [selectedPersonAssign, setSelectedPersonAssign] = useState<Person | null>(null);
  const [assignTarget, setAssignTarget] = useState<'person' | 'department'>('person');
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [deptSearch, setDeptSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<{id: number, name: string} | null>(null);

  async function loadConsumables() {
    const params: any = { page, limit: rowsPerPage, type: 'CARTUCHO' };
    if (search.trim()) params.search = search;
    if (belowMinimum) params.belowMinimum = true;
    const response = await api.get('/consumables', { params });
    setConsumables(response.data.data);
    setTotal(response.data.total);
  }

  useEffect(() => {
    loadConsumables();
    api.get('/departments').then((res) => 
      setDepartments(res.data.filter((d: any) => d.name != null))
    );
  }, []);

  useEffect(() => {
    loadConsumables();
  }, [page]);

  function clearFilters() {
    setSearch('');
    setBelowMinimum(false);
  }

  async function handleCreateConsumable() {
    try {
      await api.post('/consumables', {
        name: `${newConsumable.brand} ${newConsumable.model}`.trim(),
        brand: newConsumable.brand,
        model: newConsumable.model,
        variant: newConsumable.variant || undefined,
        minimumStock: Number(newConsumable.minimumStock || 0),
        unitMeasure: newConsumable.unitMeasure,
        type: 'CARTUCHO',
      });

      resetCreateModal();
      loadConsumables();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al crear cartucho');
    }
  }

  function resetCreateModal() {
    setNewConsumable({ brand: '', model: '', variant: '', minimumStock: '', unitMeasure: 'unidad' });
    setOpenCreate(false);
  }

  function openMovementModal(consumable: Consumable) {
    setSelectedConsumable(consumable);
    setMovementForm({ type: 'AJUSTE_POSITIVO', quantity: '', detail: '' });
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
      setMovementForm({ type: 'AJUSTE_POSITIVO', quantity: '', detail: '' });
      loadConsumables();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al registrar movimiento');
    }
  }

  function openAssignModal(consumable: Consumable) {
    setSelectedConsumableAssign(consumable);
    setAssignForm({ personId: '', departmentId: '', quantity: '', detail: '' });
    setOpenAssign(true);
  }

  async function handleAssignConsumable() {
    if (!selectedConsumableAssign) return;
    try {
      await api.post('/consumable-assignments', {
        consumableId: selectedConsumableAssign.id,
        personId: assignTarget === 'person' ? Number(assignForm.personId) : undefined,
        departmentId: assignTarget === 'department' ? Number(assignForm.departmentId) : undefined,
        quantity: Number(assignForm.quantity),
        notes: assignForm.detail,
      });
      setOpenAssign(false);
      setSelectedConsumableAssign(null);
      setAssignForm({ personId: '', departmentId: '', quantity: '', detail: '' });
      setSelectedPersonAssign(null);
      setPersonSearch('');
      setAssignTarget('person');
      loadConsumables();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al asignar cartucho');
    }
  }

  async function openHistoryModal(consumable: Consumable) {
    setSelectedConsumableHistory(consumable);
    setOpenHistory(true);
    const response = await api.get('/consumable-movements', {
      params: { consumableId: consumable.id },
    });
    setMovements(response.data);
  }

  async function handleDeleteConsumable() {
    if (!selectedConsumable) return;
    try {
      await api.delete(`/consumables/${selectedConsumable.id}`);
      setOpenDelete(false);
      setSelectedConsumable(null);
      loadConsumables();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al eliminar cartucho');
    }
  }

  async function searchPeople(query: string) {
    if (!query.trim()) {
      setFilteredPeople([]);
      return;
    }
    const response = await api.get('/people', { params: { search: query, limit: 20 } });
    setFilteredPeople(response.data.data);
  }

  function exportToExcel() {
    const rows = consumables.map((consumable) => ({
      Marca: consumable.brand || '-',
      Modelo: consumable.model,
      Variante: consumable.variant || '-',
      'Stock actual': consumable.stock?.currentStock ?? 0,
      'Stock mínimo': consumable.minimumStock,
      Unidad: consumable.unitMeasure || '-',
      'Estado stock':
        (consumable.stock?.currentStock ?? 0) <= consumable.minimumStock ? 'Stock bajo' : 'Stock OK',
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cartuchos');
    XLSX.writeFile(workbook, `cartuchos_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`);
  }


  return (
    <AppLayout>
      <Typography variant="h4" sx={{ mb: 3 }}>Cartuchos</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        {canEdit && (
          <Button variant="contained" onClick={() => setOpenCreate(true)}>
            Nuevo cartucho
          </Button>
        )}
        <Button variant="outlined" onClick={exportToExcel} disabled={consumables.length === 0}>
          Exportar a Excel
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Filtros</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Buscar por marca, modelo o variante"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
          />
          <FormControlLabel
            control={
              <Checkbox checked={belowMinimum} onChange={(e) => setBelowMinimum(e.target.checked)} />
            }
            label="Stock bajo"
          />
          <Button variant="contained" onClick={loadConsumables}>Buscar</Button>
          <Button variant="outlined" onClick={clearFilters}>Limpiar</Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Marca</TableCell>
              <TableCell>Modelo</TableCell>
              <TableCell>Variante</TableCell>
              <TableCell>Stock actual</TableCell>
              <TableCell>Stock mínimo</TableCell>
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
                  <TableCell>{consumable.brand || '-'}</TableCell>
                  <TableCell>{consumable.model}</TableCell>
                  <TableCell>{consumable.variant || '-'}</TableCell>
                  <TableCell>{currentStock}</TableCell>
                  <TableCell>{consumable.minimumStock}</TableCell>
                  <TableCell>{isLowStock ? 'Stock bajo' : 'Stock OK'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {canEdit && (
                        <>
                          <Button size="small" variant="outlined" onClick={() => openMovementModal(consumable)}>
                            Ajustar stock
                          </Button>
                          <Button size="small" variant="contained" onClick={() => openAssignModal(consumable)}>
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
                <TableCell colSpan={7} align="center">No hay cartuchos para mostrar</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[40]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        />
      </Paper>

      {/* Modal crear */}
      <Dialog open={openCreate} onClose={resetCreateModal} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo cartucho</DialogTitle>
        <DialogContent>
          <TextField
            label="Marca"
            fullWidth
            margin="normal"
            value={newConsumable.brand}
            onChange={(e) => setNewConsumable({ ...newConsumable, brand: e.target.value })}
          />
          <TextField
            label="Modelo"
            fullWidth
            margin="normal"
            value={newConsumable.model}
            onChange={(e) => setNewConsumable({ ...newConsumable, model: e.target.value })}
          />
          <TextField
            label="Variante (ej: Negro, Color, Magenta)"
            fullWidth
            margin="normal"
            value={newConsumable.variant}
            onChange={(e) => setNewConsumable({ ...newConsumable, variant: e.target.value })}
          />
          <TextField
            label="Stock mínimo"
            type="number"
            fullWidth
            margin="normal"
            value={newConsumable.minimumStock}
            onChange={(e) => setNewConsumable({ ...newConsumable, minimumStock: e.target.value })}
          />
          <TextField
            select
            label="Unidad de medida"
            fullWidth
            margin="normal"
            value={newConsumable.unitMeasure}
            onChange={(e) => setNewConsumable({ ...newConsumable, unitMeasure: e.target.value })}
          >
            <MenuItem value="unidad">Unidad</MenuItem>
            <MenuItem value="caja">Caja</MenuItem>
            <MenuItem value="pack">Pack</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetCreateModal}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCreateConsumable}
            disabled={!newConsumable.model}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal ajustar stock */}
      <Dialog open={openMovement} onClose={() => setOpenMovement(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajustar stock</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {selectedConsumable
              ? `${selectedConsumable.brand || ''} ${selectedConsumable.model} ${selectedConsumable.variant || ''}`
              : ''}
          </Typography>
          <TextField
            select
            label="Tipo de movimiento"
            fullWidth
            margin="normal"
            value={movementForm.type}
            onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value })}
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
            onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
          />
          <TextField
            label="Motivo / detalle"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={movementForm.detail}
            onChange={(e) => setMovementForm({ ...movementForm, detail: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMovement(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreateMovement} disabled={!movementForm.quantity}>
            Guardar movimiento
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal asignar */}
      <Dialog open={openAssign} onClose={() => setOpenAssign(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Asignar cartucho</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {selectedConsumableAssign
              ? `${selectedConsumableAssign.brand || ''} ${selectedConsumableAssign.model} ${selectedConsumableAssign.variant || ''}`
              : ''}
          </Typography>
          <TextField
            select
            label="Asignar a"
            fullWidth
            margin="normal"
            value={assignTarget}
            onChange={(e) => {
              setAssignTarget(e.target.value as 'person' | 'department');
              setSelectedPersonAssign(null);
              setPersonSearch('');
            }}
          >
            <MenuItem value="person">Persona</MenuItem>
            <MenuItem value="department">Dependencia</MenuItem>
          </TextField>

          {assignTarget === 'person' ? (
            <Autocomplete
              options={filteredPeople}
              filterOptions={(x) => x}
              getOptionLabel={(option) => `${option.fullName} (${option.employeeId})`}
              value={selectedPersonAssign}
              onChange={(_, newValue) => {
                setSelectedPersonAssign(newValue);
                setAssignForm({ ...assignForm, personId: newValue ? String(newValue.id) : '' });
              }}
              onInputChange={(_, value) => {
                setPersonSearch(value);
                searchPeople(value);
              }}
              inputValue={personSearch}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Buscar persona"
                  fullWidth
                  margin="normal"
                  placeholder="Escribí nombre o CUIL..."
                />
              )}
              noOptionsText={personSearch.length < 2 ? 'Escribí al menos 2 caracteres' : 'Sin resultados'}
              fullWidth
            />
          ) : (
            <Autocomplete
              options={departments}
              getOptionLabel={(option) => option?.name ?? ''}
              isOptionEqualToValue={(option, value) => option?.id === value?.id}
              value={selectedDept}
              inputValue={deptSearch}
              onInputChange={(_, value) => setDeptSearch(value)}
              onChange={(_, newValue) => {
                setSelectedDept(newValue);
                setAssignForm({ ...assignForm, departmentId: newValue ? String(newValue.id) : '' });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Buscar dependencia"
                  fullWidth
                  margin="normal"
                  placeholder="Escribí el nombre..."
                />
              )}
              noOptionsText="Sin resultados"
              fullWidth
            />
          )}

          <TextField
            label="Cantidad"
            type="number"
            fullWidth
            margin="normal"
            value={assignForm.quantity}
            onChange={(e) => setAssignForm({ ...assignForm, quantity: e.target.value })}
          />
          <TextField
            label="Motivo / detalle"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={assignForm.detail}
            onChange={(e) => setAssignForm({ ...assignForm, detail: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenAssign(false);
            setAssignTarget('person');
            setSelectedPersonAssign(null);
            setPersonSearch('');
            setSelectedDept(null);
          }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleAssignConsumable}
            disabled={
              (assignTarget === 'person' ? !assignForm.personId : !assignForm.departmentId) ||
              !assignForm.quantity
            }
          >
            Asignar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal historial */}
      <Dialog open={openHistory} onClose={() => setOpenHistory(false)} maxWidth="md" fullWidth>
        <DialogTitle>Historial de cartucho</DialogTitle>
        <DialogContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {selectedConsumableHistory
              ? `${selectedConsumableHistory.brand || ''} ${selectedConsumableHistory.model} ${selectedConsumableHistory.variant || ''}`
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
                  <TableCell>{new Date(movement.date).toLocaleString()}</TableCell>
                  <TableCell>{movement.type}</TableCell>
                  <TableCell>{movement.quantity}</TableCell>
                  <TableCell>{movement.previousStock}</TableCell>
                  <TableCell>{movement.newStock}</TableCell>
                  <TableCell>{movement.detail || '-'}</TableCell>
                </TableRow>
              ))}
              {movements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">Sin movimientos</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHistory(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal eliminar */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar cartucho</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Confirmás que querés eliminar{' '}
            <strong>
              {selectedConsumable?.brand} {selectedConsumable?.model} {selectedConsumable?.variant}
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
