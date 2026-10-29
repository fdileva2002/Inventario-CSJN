import { useState, type ReactNode } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { api } from '../api/axios';

// Altas rápidas desde otra pantalla (por ejemplo, la orden de compra) sin perder lo cargado.
// Cada diálogo devuelve lo creado en onCreated para que quien lo abre lo seleccione.

type ApiError = { response?: { data?: { message?: string | string[] } } };

function errorMessage(error: unknown, fallback: string) {
  const message = (error as ApiError)?.response?.data?.message;
  return Array.isArray(message) ? message.join('. ') : message || fallback;
}

type BaseProps<T> = {
  open: boolean;
  onClose: () => void;
  onCreated: (created: T) => void;
};

function QuickDialog({
  open,
  title,
  error,
  saving,
  canSave,
  onClose,
  onSave,
  children,
}: {
  open: boolean;
  title: string;
  error: string;
  saving: boolean;
  canSave: boolean;
  onClose: () => void;
  onSave: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {children}
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={onSave} disabled={!canSave || saving}>
          Crear
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export type QuickSupplier = { id: number; name: string };

export function QuickSupplierDialog({ open, onClose, onCreated }: BaseProps<QuickSupplier>) {
  const empty = { name: '', taxId: '', phone: '', email: '' };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function close() {
    setForm(empty);
    setError('');
    onClose();
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const response = await api.post('/suppliers', {
        name: form.name.trim(),
        taxId: form.taxId.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      onCreated(response.data);
      close();
    } catch (err) {
      setError(errorMessage(err, 'Error al crear el proveedor'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <QuickDialog
      open={open}
      title="Nuevo proveedor"
      error={error}
      saving={saving}
      canSave={form.name.trim() !== ''}
      onClose={close}
      onSave={save}
    >
      <TextField label="Nombre" fullWidth margin="dense" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <TextField label="CUIT" fullWidth margin="dense" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
      <TextField label="Teléfono" fullWidth margin="dense" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <TextField label="Email" type="email" fullWidth margin="dense" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
    </QuickDialog>
  );
}

export type QuickDeviceModel = { id: number; brand: string; model: string; category?: { id: number; name: string } };

export function QuickDeviceModelDialog({
  open,
  onClose,
  onCreated,
  categories,
  defaultCategoryId,
}: BaseProps<QuickDeviceModel> & { categories: { id: number; name: string }[]; defaultCategoryId?: string }) {
  const [form, setForm] = useState({ categoryId: '', brand: '', model: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const categoryId = form.categoryId || defaultCategoryId || '';

  function close() {
    setForm({ categoryId: '', brand: '', model: '' });
    setError('');
    onClose();
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const response = await api.post('/device-models', {
        categoryId: Number(categoryId),
        brand: form.brand.trim(),
        model: form.model.trim(),
      });
      onCreated(response.data);
      close();
    } catch (err) {
      setError(errorMessage(err, 'Error al crear el modelo'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <QuickDialog
      open={open}
      title="Nuevo modelo de dispositivo"
      error={error}
      saving={saving}
      canSave={!!categoryId && form.brand.trim() !== '' && form.model.trim() !== ''}
      onClose={close}
      onSave={save}
    >
      <TextField select label="Categoría" fullWidth margin="dense" value={categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
        {categories.map((category) => (
          <MenuItem key={category.id} value={String(category.id)}>
            {category.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField label="Marca" fullWidth margin="dense" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
      <TextField label="Modelo" fullWidth margin="dense" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
    </QuickDialog>
  );
}

export type QuickConsumable = { id: number; name: string; model: string; variant?: string | null; type?: string };

export function QuickConsumableDialog({ open, onClose, onCreated }: BaseProps<QuickConsumable>) {
  const empty = { type: 'CARTUCHO', name: '', brand: '', model: '', variant: '', minimumStock: '' };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isCartridge = form.type === 'CARTUCHO';

  function close() {
    setForm(empty);
    setError('');
    onClose();
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const response = await api.post('/consumables', {
        type: form.type,
        // Igual que en Cartuchos: el nombre de un cartucho es marca + modelo.
        name: isCartridge ? `${form.brand} ${form.model}`.trim() : form.name.trim(),
        brand: form.brand.trim() || undefined,
        model: form.model.trim(),
        variant: form.variant.trim() || undefined,
        minimumStock: Number(form.minimumStock || 0),
        unitMeasure: 'unidad',
      });
      onCreated(response.data);
      close();
    } catch (err) {
      setError(errorMessage(err, 'Error al crear el consumible'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <QuickDialog
      open={open}
      title="Nuevo consumible"
      error={error}
      saving={saving}
      canSave={(isCartridge || form.name.trim() !== '') && form.model.trim() !== ''}
      onClose={close}
      onSave={save}
    >
      <TextField select label="Tipo" fullWidth margin="dense" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
        <MenuItem value="CARTUCHO">Cartucho / tóner</MenuItem>
        <MenuItem value="OTRO">Otro insumo</MenuItem>
      </TextField>
      {!isCartridge && (
        <TextField label="Nombre" fullWidth margin="dense" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      )}
      <TextField label="Marca" fullWidth margin="dense" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
      <TextField label="Modelo" fullWidth margin="dense" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
      <TextField label="Color / variante" fullWidth margin="dense" placeholder="Ej: Negro" value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })} />
      <TextField label="Stock mínimo" type="number" fullWidth margin="dense" value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: e.target.value })} />
    </QuickDialog>
  );
}
