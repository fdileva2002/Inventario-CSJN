import { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Checkbox,
  Chip,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import AppLayout from '../components/AppLayout';
import { api } from '../api/axios';

type Kind = 'DEVICE' | 'CONSUMABLE' | 'COMPONENT';

type MovementRow = {
  id: number;
  date: string;
  type: string;
  deviceId: number | null;
  item: string;
  itemDetail: string | null;
  quantity: number | null;
  previousStock: number | null;
  newStock: number | null;
  previousStatus: string | null;
  newStatus: string | null;
  previousLocation: string | null;
  newLocation: string | null;
  recipient: string | null;
  detail: string | null;
  user: string | null;
};

type Summary = { type: string; count: number; quantity: number | null };

type Option = { id: number; label: string };

type ApiError = { response?: { data?: { message?: string } } };

const KINDS: { value: Kind; label: string }[] = [
  { value: 'DEVICE', label: 'Equipos' },
  { value: 'CONSUMABLE', label: 'Consumibles' },
  { value: 'COMPONENT', label: 'Componentes' },
];

const TYPE_LABELS: Record<Kind, Record<string, string>> = {
  DEVICE: {
    ALTA_MANUAL: 'Alta manual',
    INGRESO_POR_COMPRA: 'Ingreso por compra',
    ASIGNACION: 'Asignación',
    DEVOLUCION: 'Devolución',
    CAMBIO_ESTADO: 'Cambio de estado',
    REPARACION: 'Reparación',
    BAJA: 'Baja',
    ACTUALIZACION: 'Actualización',
  },
  CONSUMABLE: {
    INGRESO_POR_COMPRA: 'Ingreso por compra',
    SALIDA_POR_CONSUMO: 'Entrega / consumo',
    AJUSTE_POSITIVO: 'Ajuste positivo',
    AJUSTE_NEGATIVO: 'Ajuste negativo',
  },
  COMPONENT: {
    ALTA: 'Alta',
    INSTALACION: 'Instalación',
    RETIRO: 'Retiro',
    BAJA: 'Baja',
  },
};

const STATUS_LABELS: Record<string, string> = {
  A_CONFIGURAR: 'A configurar',
  DISPONIBLE: 'Disponible',
  EN_FUNCIONAMIENTO: 'En funcionamiento',
  EN_REPARACION: 'En reparación',
  EN_BAJA: 'En baja',
};

// Fechas como YYYY-MM-DD en hora local (lo que usan los <input type="date">).
function toInputDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function quickRanges() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  return [
    { label: 'Hoy', from: toInputDate(today), to: toInputDate(today) },
    { label: 'Últimos 7 días', from: toInputDate(new Date(y, m, today.getDate() - 6)), to: toInputDate(today) },
    { label: 'Este mes', from: toInputDate(new Date(y, m, 1)), to: toInputDate(today) },
    { label: 'Mes anterior', from: toInputDate(new Date(y, m - 1, 1)), to: toInputDate(new Date(y, m, 0)) },
    { label: 'Este año', from: toInputDate(new Date(y, 0, 1)), to: toInputDate(today) },
  ];
}

// "Hasta" incluye el día entero: se manda el inicio del día siguiente, en hora local.
function rangeParams(from: string, to: string) {
  const params: Record<string, string> = {};
  if (from) params.from = new Date(`${from}T00:00:00`).toISOString();
  if (to) {
    const end = new Date(`${to}T00:00:00`);
    end.setDate(end.getDate() + 1);
    params.to = end.toISOString();
  }
  return params;
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function change(from: string | null, to: string | null, labels?: Record<string, string>) {
  if (!from && !to) return '';
  const label = (value: string | null) => (value ? labels?.[value] ?? value : '—');
  return `${label(from)} → ${label(to)}`;
}

export default function MovementsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const kind = (KINDS.some((k) => k.value === searchParams.get('kind')) ? searchParams.get('kind') : 'DEVICE') as Kind;
  const [types, setTypes] = useState<string[]>([]);
  // Desde Personas o Dependencias se abre con todo el historial; si no, con el mes en curso.
  const fromRecipient = searchParams.has('personId') || searchParams.has('departmentId');
  const [from, setFrom] = useState(searchParams.get('from') ?? (fromRecipient ? '' : quickRanges()[2].from));
  const [to, setTo] = useState(searchParams.get('to') ?? (fromRecipient ? '' : quickRanges()[2].to));
  const [search, setSearch] = useState('');
  const [person, setPerson] = useState<Option | null>(null);
  const [department, setDepartment] = useState<Option | null>(null);

  const [personOptions, setPersonOptions] = useState<Option[]>([]);
  const [personInput, setPersonInput] = useState('');
  const [departments, setDepartments] = useState<Option[]>([]);

  const [rows, setRows] = useState<MovementRow[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [total, setTotal] = useState(0);
  const [pageState, setPageState] = useState({ key: '', page: 0 });
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const typeLabels = TYPE_LABELS[kind];
  const hasRecipient = kind !== 'COMPONENT';

  // Llegada desde Personas o Dependencias: /movements?personId=5 o ?departmentId=3.
  useEffect(() => {
    const departmentId = Number(searchParams.get('departmentId'));
    api.get('/departments').then((response) => {
      const options: Option[] = response.data.map((d: { id: number; name: string }) => ({ id: d.id, label: d.name }));
      setDepartments(options);
      if (departmentId) setDepartment(options.find((d) => d.id === departmentId) ?? null);
    });

    const personId = Number(searchParams.get('personId'));
    if (personId) {
      api.get(`/people/${personId}`).then((response) =>
        setPerson({ id: response.data.id, label: response.data.fullName }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
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
  }, [personInput]);

  const filters = useMemo(
    () => ({
      kind,
      types: types.length ? types.join(',') : undefined,
      search: search.trim() || undefined,
      personId: hasRecipient ? person?.id : undefined,
      departmentId: hasRecipient ? department?.id : undefined,
      ...rangeParams(from, to),
    }),
    [kind, types, search, person, department, from, to, hasRecipient],
  );

  // La página vuelve a 0 cuando cambia cualquier filtro.
  const filtersKey = JSON.stringify(filters);
  const page = pageState.key === filtersKey ? pageState.page : 0;
  const setPage = (value: number) => setPageState({ key: filtersKey, page: value });

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      setError('');
      api
        .get('/movements', { params: { ...filters, page, limit } })
        .then((response) => {
          setRows(response.data.data);
          setSummary(response.data.summary);
          setTotal(response.data.total);
        })
        .catch((err) => setError(err?.response?.data?.message || 'Error al cargar los movimientos'))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [filters, page, limit]);

  function changeKind(value: Kind) {
    setTypes([]);
    const next = new URLSearchParams(searchParams);
    next.set('kind', value);
    setSearchParams(next, { replace: true });
  }

  function toggleType(type: string) {
    setTypes((current) => (current.includes(type) ? current.filter((t) => t !== type) : [...current, type]));
  }

  function clearFilters() {
    setTypes([]);
    setSearch('');
    setPerson(null);
    setDepartment(null);
    setFrom('');
    setTo('');
    setSearchParams({ kind }, { replace: true });
  }

  const summaryByType = new Map(summary.map((s) => [s.type, s]));
  const summaryTotal = summary
    .filter((s) => types.length === 0 || types.includes(s.type))
    .reduce((acc, s) => acc + s.count, 0);

  function describeFilters() {
    return [
      `Tipo de registro: ${KINDS.find((k) => k.value === kind)?.label}`,
      `Desde: ${from || 'sin límite'}`,
      `Hasta: ${to || 'sin límite'}`,
      `Movimientos: ${types.length ? types.map((t) => typeLabels[t] ?? t).join(', ') : 'todos'}`,
      person && hasRecipient ? `Persona: ${person.label}` : null,
      department && hasRecipient ? `Dependencia: ${department.label}` : null,
      search.trim() ? `Búsqueda: ${search.trim()}` : null,
    ].filter(Boolean) as string[];
  }

  async function exportToExcel() {
    setExporting(true);
    setError('');
    try {
      const response = await api.get<MovementRow[]>('/movements/export', { params: filters });

      const movementSheet = XLSX.utils.json_to_sheet(
        response.data.map((row) => ({
          Fecha: new Date(row.date).toLocaleString('es-AR'),
          Movimiento: typeLabels[row.type] ?? row.type,
          [kind === 'DEVICE' ? 'Tag' : kind === 'CONSUMABLE' ? 'Consumible' : 'Componente']: row.item,
          Detalle: row.itemDetail ?? '',
          ...(kind === 'CONSUMABLE'
            ? { Cantidad: row.quantity, 'Stock anterior': row.previousStock, 'Stock nuevo': row.newStock }
            : {}),
          ...(kind === 'DEVICE'
            ? {
                'Estado anterior': row.previousStatus ? STATUS_LABELS[row.previousStatus] ?? row.previousStatus : '',
                'Estado nuevo': row.newStatus ? STATUS_LABELS[row.newStatus] ?? row.newStatus : '',
                'Ubicación anterior': row.previousLocation ?? '',
                'Ubicación nueva': row.newLocation ?? '',
              }
            : {}),
          ...(kind === 'COMPONENT' ? { Equipo: row.newLocation ?? '' } : {}),
          ...(hasRecipient ? { 'Asignado a': row.recipient ?? '' } : {}),
          Observaciones: row.detail ?? '',
          Usuario: row.user ?? '',
        })),
      );

      // Resumen con los mismos filtros: cuántos movimientos de cada tipo en el período.
      const summaryRows = Object.entries(typeLabels)
        .filter(([type]) => types.length === 0 || types.includes(type))
        .map(([type, label]) => {
          const item = summaryByType.get(type);
          return {
            Movimiento: label,
            Cantidad: item?.count ?? 0,
            ...(kind === 'CONSUMABLE' ? { Unidades: item?.quantity ?? 0 } : {}),
          };
        });
      const filterLines = describeFilters();
      const summarySheet = XLSX.utils.aoa_to_sheet(filterLines.map((line) => [line]));
      XLSX.utils.sheet_add_json(summarySheet, summaryRows, { origin: `A${filterLines.length + 2}` });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
      XLSX.utils.book_append_sheet(workbook, movementSheet, 'Movimientos');
      const name = KINDS.find((k) => k.value === kind)?.label.toLowerCase();
      XLSX.writeFile(workbook, `movimientos_${name}_${from || 'inicio'}_a_${to || 'hoy'}.xlsx`);
    } catch (err) {
      setError((err as ApiError)?.response?.data?.message || 'Error al exportar');
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppLayout>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ mb: 2, justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Typography variant="h4">Movimientos</Typography>
        <Button variant="outlined" onClick={exportToExcel} disabled={exporting || total === 0}>
          {exporting ? 'Exportando...' : `Exportar a Excel (${total})`}
        </Button>
      </Stack>

      <Tabs
        value={kind}
        onChange={(_, value) => changeKind(value)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ mb: 2 }}
      >
        {KINDS.map((k) => (
          <Tab key={k.value} value={k.value} label={k.label} />
        ))}
      </Tabs>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
          }}
        >
          <TextField
            label="Desde"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Hasta"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            select
            label="Tipo de movimiento"
            value={types}
            onChange={(e) => {
              const value = e.target.value as unknown as string[] | string;
              setTypes(typeof value === 'string' ? value.split(',') : value);
            }}
            slotProps={{
              select: {
                multiple: true,
                renderValue: (selected) =>
                  (selected as string[]).length === 0
                    ? 'Todos'
                    : (selected as string[]).map((t) => typeLabels[t] ?? t).join(', '),
                displayEmpty: true,
              },
              inputLabel: { shrink: true },
            }}
          >
            {Object.entries(typeLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                <Checkbox checked={types.includes(value)} size="small" />
                <ListItemText primary={label} />
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={
              kind === 'DEVICE'
                ? 'Buscar tag, serie u hostname'
                : kind === 'CONSUMABLE'
                  ? 'Buscar consumible'
                  : 'Buscar componente o tag del equipo'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {hasRecipient && (
            <>
              <Autocomplete
                options={personOptions}
                value={person}
                onChange={(_, value) => setPerson(value)}
                onInputChange={(_, value, reason) => reason === 'input' && setPersonInput(value)}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                filterOptions={(options) => options}
                renderInput={(params) => <TextField {...params} label="Persona" />}
                noOptionsText="Sin resultados"
              />
              <Autocomplete
                options={departments}
                value={department}
                onChange={(_, value) => setDepartment(value)}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => <TextField {...params} label="Dependencia" />}
                noOptionsText="Sin resultados"
              />
            </>
          )}
        </Box>

        <Stack direction="row" sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
          {quickRanges().map((range) => (
            <Chip
              key={range.label}
              label={range.label}
              variant={from === range.from && to === range.to ? 'filled' : 'outlined'}
              color={from === range.from && to === range.to ? 'primary' : 'default'}
              onClick={() => {
                setFrom(range.from);
                setTo(range.to);
              }}
            />
          ))}
          <Chip
            label="Todo el historial"
            variant={!from && !to ? 'filled' : 'outlined'}
            color={!from && !to ? 'primary' : 'default'}
            onClick={() => {
              setFrom('');
              setTo('');
            }}
          />
          <Button size="small" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </Stack>
      </Paper>

      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        {summaryTotal} movimiento{summaryTotal === 1 ? '' : 's'} en el período
        {types.length > 0 ? ' (tipos seleccionados)' : ''}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          mb: 2,
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
        }}
      >
        {Object.entries(typeLabels).map(([type, label]) => {
          const item = summaryByType.get(type);
          const selected = types.includes(type);
          return (
            <Card
              key={type}
              variant="outlined"
              sx={{
                borderColor: selected ? 'primary.main' : undefined,
                opacity: types.length > 0 && !selected ? 0.55 : 1,
              }}
            >
              <CardActionArea onClick={() => toggleType(type)} sx={{ height: '100%' }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="h5">{item?.count ?? 0}</Typography>
                  {kind === 'CONSUMABLE' && (
                    <Typography variant="caption" color="text.secondary">
                      {item?.quantity ?? 0} unidades
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Paper>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Movimiento</TableCell>
                <TableCell>{kind === 'DEVICE' ? 'Equipo' : kind === 'CONSUMABLE' ? 'Consumible' : 'Componente'}</TableCell>
                {kind === 'CONSUMABLE' && <TableCell align="right">Cantidad</TableCell>}
                {kind === 'CONSUMABLE' && <TableCell>Stock</TableCell>}
                {kind === 'DEVICE' && <TableCell>Estado</TableCell>}
                {kind === 'DEVICE' && <TableCell>Ubicación</TableCell>}
                {kind === 'COMPONENT' && <TableCell>Equipo</TableCell>}
                {hasRecipient && <TableCell>Asignado a</TableCell>}
                <TableCell>Observaciones</TableCell>
                <TableCell>Usuario</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(row.date)}</TableCell>
                  <TableCell>{typeLabels[row.type] ?? row.type}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.item}</Typography>
                    {row.itemDetail && (
                      <Typography variant="caption" color="text.secondary">
                        {row.itemDetail}
                      </Typography>
                    )}
                  </TableCell>
                  {kind === 'CONSUMABLE' && <TableCell align="right">{row.quantity}</TableCell>}
                  {kind === 'CONSUMABLE' && (
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {row.previousStock} → {row.newStock}
                    </TableCell>
                  )}
                  {kind === 'DEVICE' && <TableCell>{change(row.previousStatus, row.newStatus, STATUS_LABELS) || '-'}</TableCell>}
                  {kind === 'DEVICE' && <TableCell>{change(row.previousLocation, row.newLocation) || '-'}</TableCell>}
                  {kind === 'COMPONENT' && <TableCell>{row.newLocation || '-'}</TableCell>}
                  {hasRecipient && <TableCell>{row.recipient || '-'}</TableCell>}
                  <TableCell>{row.detail || '-'}</TableCell>
                  <TableCell>{row.user || '-'}</TableCell>
                </TableRow>
              ))}

              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    {loading ? 'Cargando...' : 'No hay movimientos con estos filtros'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, value) => setPage(value)}
          rowsPerPage={limit}
          onRowsPerPageChange={(e) => setLimit(Number(e.target.value))}
          rowsPerPageOptions={[25, 50, 100, 200]}
          labelRowsPerPage="Filas"
          labelDisplayedRows={({ from: start, to: end, count }) => `${start}-${end} de ${count}`}
        />
      </Paper>
    </AppLayout>
  );
}
