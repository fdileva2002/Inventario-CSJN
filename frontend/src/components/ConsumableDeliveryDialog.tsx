import { useEffect, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { api } from '../api/axios';

// Entrega de uno o varios consumibles (cartuchos y otros insumos) a una persona o
// dependencia. Se descuentan todos en una sola operación: si a uno le falta stock,
// no se entrega ninguno.

export type DeliveryConsumable = {
  id: number;
  name: string;
  brand?: string | null;
  model: string;
  variant?: string | null;
  type?: string;
  stock?: { currentStock: number } | null;
};

type Line = { consumable: DeliveryConsumable; quantity: string };
type Option = { id: number; label: string };
type ApiError = { response?: { data?: { message?: string | string[] } } };

function consumableName(c: DeliveryConsumable) {
  return [c.name, c.name.includes(c.model) ? null : c.model, c.variant ? `(${c.variant})` : null]
    .filter(Boolean)
    .join(' ');
}

type Props = {
  open: boolean;
  // Consumible desde el que se abrió (botón "Asignar" de una fila); se agrega solo.
  initial?: DeliveryConsumable | null;
  onClose: () => void;
  onDelivered: () => void;
};

export default function ConsumableDeliveryDialog({ open, initial, onClose, onDelivered }: Props) {
  const [target, setTarget] = useState<'person' | 'department'>('person');
  const [person, setPerson] = useState<Option | null>(null);
  const [department, setDepartment] = useState<Option | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [personInput, setPersonInput] = useState('');
  const [personOptions, setPersonOptions] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [consumableInput, setConsumableInput] = useState('');
  const [consumableOptions, setConsumableOptions] = useState<DeliveryConsumable[]>([]);

  // Al abrir: formulario limpio con el consumible inicial, si lo hay.
  const [openedFor, setOpenedFor] = useState<{ open: boolean; initial?: DeliveryConsumable | null }>({ open: false });
  if (open !== openedFor.open || initial !== openedFor.initial) {
    setOpenedFor({ open, initial });
    if (open) {
      setTarget('person');
      setPerson(null);
      setDepartment(null);
      setLines(initial ? [{ consumable: initial, quantity: '1' }] : []);
      setNotes('');
      setError('');
    }
  }

  useEffect(() => {
    if (!open) return;
    api.get('/departments').then((response) =>
      setDepartments(response.data.map((d: { id: number; name: string }) => ({ id: d.id, label: d.name }))),
    );
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      api
        .get('/people', { params: { search: personInput || undefined, limit: 20 } })
        .then((response) =>
          setPersonOptions(
            response.data.data.map((p: { id: number; fullName: string; employeeId: string }) => ({
              id: p.id,
              label: `${p.fullName} (${p.employeeId})`,
            })),
          ),
        );
    }, 300);
    return () => clearTimeout(handle);
  }, [personInput, open]);

  // Busca entre todos los consumibles, de cualquier tipo.
  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      api
        .get('/consumables', { params: { search: consumableInput || undefined, limit: 30 } })
        .then((response) => setConsumableOptions(response.data.data));
    }, 300);
    return () => clearTimeout(handle);
  }, [consumableInput, open]);

  function addConsumable(consumable: DeliveryConsumable | null) {
    if (!consumable) return;
    setLines((current) =>
      current.some((line) => line.consumable.id === consumable.id)
        ? current
        : [...current, { consumable, quantity: '1' }],
    );
    setConsumableInput('');
  }

  function updateQuantity(id: number, quantity: string) {
    setLines((current) => current.map((line) => (line.consumable.id === id ? { ...line, quantity } : line)));
  }

  function removeLine(id: number) {
    setLines((current) => current.filter((line) => line.consumable.id !== id));
  }

  const recipient = target === 'person' ? person : department;
  const overStock = lines.filter(
    (line) => line.consumable.stock && Number(line.quantity) > line.consumable.stock.currentStock,
  );
  const canSave =
    !!recipient &&
    lines.length > 0 &&
    lines.every((line) => Number.isInteger(Number(line.quantity)) && Number(line.quantity) > 0) &&
    overStock.length === 0;

  async function save() {
    setSaving(true);
    setError('');
    try {
      await api.post('/consumable-assignments/batch', {
        personId: target === 'person' ? person?.id : undefined,
        departmentId: target === 'department' ? department?.id : undefined,
        notes: notes.trim() || undefined,
        items: lines.map((line) => ({ consumableId: line.consumable.id, quantity: Number(line.quantity) })),
      });
      onDelivered();
      onClose();
    } catch (err) {
      const message = (err as ApiError)?.response?.data?.message;
      setError(Array.isArray(message) ? message.join('. ') : message || 'Error al registrar la entrega');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Entregar consumibles</DialogTitle>
      <DialogContent>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={target}
          onChange={(_, value) => value && setTarget(value)}
          sx={{ mt: 1, mb: 1 }}
        >
          <ToggleButton value="person">A una persona</ToggleButton>
          <ToggleButton value="department">A una dependencia</ToggleButton>
        </ToggleButtonGroup>

        {target === 'person' ? (
          <Autocomplete
            options={personOptions}
            value={person}
            onChange={(_, value) => setPerson(value)}
            onInputChange={(_, value, reason) => reason === 'input' && setPersonInput(value)}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            filterOptions={(options) => options}
            renderInput={(params) => (
              <TextField {...params} label="Persona" placeholder="Nombre o CUIL" margin="dense" />
            )}
            noOptionsText="Sin resultados"
          />
        ) : (
          <Autocomplete
            options={departments}
            value={department}
            onChange={(_, value) => setDepartment(value)}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => <TextField {...params} label="Dependencia" margin="dense" />}
            noOptionsText="Sin resultados"
          />
        )}

        <Autocomplete
          options={consumableOptions}
          value={null}
          inputValue={consumableInput}
          onInputChange={(_, value, reason) => reason !== 'reset' && setConsumableInput(value)}
          onChange={(_, value) => addConsumable(value)}
          getOptionLabel={consumableName}
          getOptionDisabled={(option) => lines.some((line) => line.consumable.id === option.id)}
          filterOptions={(options) => options}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                <span>{consumableName(option)}</span>
                <Typography variant="body2" color={(option.stock?.currentStock ?? 0) > 0 ? 'text.secondary' : 'error'}>
                  Stock: {option.stock?.currentStock ?? 0}
                </Typography>
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Agregar consumible"
              placeholder="Buscá por nombre, marca, modelo o color"
              margin="dense"
            />
          )}
          noOptionsText="Sin resultados"
        />

        <Box sx={{ overflowX: 'auto', mt: 1 }}>
          <Table size="small" sx={{ minWidth: 420 }}>
            <TableHead>
              <TableRow>
                <TableCell>Consumible</TableCell>
                <TableCell align="right">Stock</TableCell>
                <TableCell sx={{ width: 110 }}>Cantidad</TableCell>
                <TableCell sx={{ width: 48 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((line) => {
                const stock = line.consumable.stock?.currentStock ?? 0;
                const exceeds = Number(line.quantity) > stock;
                return (
                  <TableRow key={line.consumable.id}>
                    <TableCell>{consumableName(line.consumable)}</TableCell>
                    <TableCell align="right">{stock}</TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={line.quantity}
                        error={exceeds}
                        onChange={(e) => updateQuantity(line.consumable.id, e.target.value)}
                        slotProps={{ htmlInput: { min: 1 } }}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" aria-label="Quitar" onClick={() => removeLine(line.consumable.id)}>
                        ✕
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              {lines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Agregá al menos un consumible
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        <TextField
          label="Motivo / detalle"
          fullWidth
          margin="normal"
          multiline
          minRows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {overStock.length > 0 && (
          <Typography color="error" variant="body2">
            No hay stock suficiente de: {overStock.map((line) => consumableName(line.consumable)).join(', ')}
          </Typography>
        )}
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" onClick={save} disabled={!canSave || saving}>
            Entregar {lines.length > 1 ? `${lines.length} ítems` : ''}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
