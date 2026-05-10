import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Checkbox,
  FormControlLabel,
  Paper,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { api } from '../api/axios';
import AppLayout from '../components/AppLayout';
import { getUser } from '../auth/auth.storage';


type PurchaseOrder = {
  id: number;
  number: string;
  date: string;
  status?: string;
  supplier?: { id: number; name: string };
  parentOrder?: { id: number; number: string } | null;
};

type Supplier = {
  id: number;
  name: string;
};

type PurchaseOrderItem = {
  id: number;
  itemType: 'DEVICE' | 'CONSUMABLE';
  quantity: number;
  unitPrice?: number | null;
  notes?: string | null;
  deviceModel?: {
    brand: string;
    model: string;
  } | null;
  consumable?: {
    name: string;
    model: string;
  } | null;
};

type DeviceModel = {
  id: number;
  brand: string;
  model: string;
};

type Consumable = {
  id: number;
  name: string;
  model: string;
};

type Receipt = {
  id: number;
  receiptNumber: string;
  receivedAt: string;
  notes?: string | null;
  devicesCreated?: number;
  totalDevicesExpected?: number;
  devicesFullyLoaded?: boolean;
  items?: {
    id: number;
    receivedQuantity: number;
    purchaseOrderItem?: {
      itemType: 'DEVICE' | 'CONSUMABLE';
      deviceModel?: { brand: string; model: string } | null;
      consumable?: { name: string; model: string } | null;
    };
  }[];
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [openCreate, setOpenCreate] = useState(false);

  const [newOrder, setNewOrder] = useState({
    orderNumber: '',
    year: String(new Date().getFullYear()),
    supplierId: '',
    isAmpliation: false,
    parentOrderId: '',
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);

  const [models, setModels] = useState<DeviceModel[]>([]);
  const [consumables, setConsumables] = useState<Consumable[]>([]);

  const [newItem, setNewItem] = useState({
    itemType: 'DEVICE',
    deviceModelId: '',
    consumableId: '',
    quantity: '',
    unitPrice: '',
    notes: '',
  });
  const [openReceipt, setOpenReceipt] = useState(false);

  const [newReceipt, setNewReceipt] = useState({
    receiptNumber: '',
    receivedAt: new Date().toISOString().slice(0, 10),
    notes: '',
    items: {} as Record<number, string>,
  });
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [openDevicesReceipt, setOpenDevicesReceipt] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [receiptDevices, setReceiptDevices] = useState<string[]>([]);
  const [devicesExcelFile, setDevicesExcelFile] = useState<File | null>(null);

  const user = getUser();
  const canEdit = user?.role === 'EDICION';
  const [selectedItemCategoryId, setSelectedItemCategoryId] = useState('');

  const [openDelete, setOpenDelete] = useState(false);

  const [yearFilter, setYearFilter] = useState('');
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  async function handleDeleteOrder() {
    if (!selectedOrder) return;
    try {
      await api.delete(`/purchase-orders/${selectedOrder.id}`);
      setOpenDelete(false);
      setSelectedOrder(null);
      loadOrders();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al eliminar orden');
    }
  }

  const filteredItemModels = selectedItemCategoryId
    ? models.filter((m: any) => m.category?.id === Number(selectedItemCategoryId))
    : models;
  

  async function loadOrders() {
    const params: any = {};
    if (yearFilter) params.year = yearFilter;
    const response = await api.get('/purchase-orders', { params });
    setOrders(response.data);
  }

  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);

  async function loadCategories() {
    const response = await api.get('/device-categories');
    setCategories(response.data);
  }


  useEffect(() => {
    loadOrders();
    loadSuppliers();
    loadModels();
    loadConsumables();
    loadCategories();
  }, []);

  async function handleCreateOrder() {
    try {
      await api.post('/purchase-orders', {
        number: `${newOrder.orderNumber.padStart(2, '0')}/${newOrder.year}`,
        supplierId: Number(newOrder.supplierId),
        date: new Date().toISOString(),
        parentOrderId: newOrder.isAmpliation && newOrder.parentOrderId
          ? Number(newOrder.parentOrderId)
          : undefined,
      });
      setOpenCreate(false);
      setNewOrder({
        orderNumber: '',
        year: String(new Date().getFullYear()),
        supplierId: '',
        isAmpliation: false,
        parentOrderId: '',
      });
      loadOrders();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al crear orden');
    }
  }

    async function loadSuppliers() {
      const response = await api.get('/suppliers');
      setSuppliers(response.data);
    }

    async function loadModels() {
      const response = await api.get('/device-models');
      setModels(response.data);
    }

    async function loadConsumables() {
      const response = await api.get('/consumables');
      setConsumables(response.data);
    }

    async function openOrderDetail(order: PurchaseOrder) {
      setSelectedOrder(order);
      setOpenDetail(true);

      const response = await api.get('/purchase-order-items', {
        params: {
          purchaseOrderId: order.id,
        },
      });
    
      setItems(response.data);
      const receiptsResponse = await api.get('/receipts', {
        params: {
          purchaseOrderId: order.id,
        },
      });

      setReceipts(receiptsResponse.data);
    }

    async function handleCreateItem() {
      if (!selectedOrder) return;

      await api.post('/purchase-order-items', {
        purchaseOrderId: selectedOrder.id,
        itemType: newItem.itemType,
        deviceModelId:
          newItem.itemType === 'DEVICE' ? Number(newItem.deviceModelId) : undefined,
        consumableId:
          newItem.itemType === 'CONSUMABLE'
            ? Number(newItem.consumableId)
            : undefined,
        quantity: Number(newItem.quantity),
        unitPrice: newItem.unitPrice ? Number(newItem.unitPrice) : undefined,
        notes: newItem.notes,
      });
    
      setNewItem({
        itemType: 'DEVICE',
        deviceModelId: '',
        consumableId: '',
        quantity: '',
        unitPrice: '',
        notes: '',
      });
    
      openOrderDetail(selectedOrder);
    }

    function openReceiptModal() {
      const initialItems: Record<number, string> = {};

      items.forEach((item) => {
        initialItems[item.id] = '';
      });
    
      setNewReceipt({
        receiptNumber: '',
        receivedAt: new Date().toISOString().slice(0, 10),
        notes: '',
        items: initialItems,
      });
    
      setOpenReceipt(true);
    }

    async function handleCreateReceipt() {
      if (!selectedOrder) return;

      try {
        await api.post('/receipts', {
          purchaseOrderId: selectedOrder.id,
          receiptNumber: newReceipt.receiptNumber || undefined,
          receivedAt: new Date(newReceipt.receivedAt).toISOString(),
          notes: newReceipt.notes || undefined,
          items: Object.entries(newReceipt.items)
            .filter(([, quantity]) => Number(quantity) > 0)
            .map(([purchaseOrderItemId, quantity]) => ({
              purchaseOrderItemId: Number(purchaseOrderItemId),
              receivedQuantity: Number(quantity),
            })),
        });
      
        setOpenReceipt(false);
        openOrderDetail(selectedOrder);
        loadOrders();
      } catch (error: any) {
        console.log(error);
        alert(error?.response?.data?.message || 'Error al crear recepción');
      }
    }

    function receiptHasDevices(receipt: Receipt) {
      return receipt.items?.some(
        (item) => item.purchaseOrderItem?.itemType === 'DEVICE',
      );
    }

    function openDevicesReceiptModal(receipt: Receipt) {
      const totalDevices =
        receipt.items
          ?.filter((item) => item.purchaseOrderItem?.itemType === 'DEVICE')
          .reduce((acc, item) => acc + item.receivedQuantity, 0) ?? 0;

      setSelectedReceipt(receipt);
      setReceiptDevices(Array(totalDevices).fill(''));
      setOpenDevicesReceipt(true);
    }

    async function handleCreateDevicesFromReceipt() {
      if (!selectedReceipt) return;

      await api.post(`/receipts/${selectedReceipt.id}/devices`, {
        devices: receiptDevices.map((serialNumber) => ({
          serialNumber,
        })),
      });
    
      setOpenDevicesReceipt(false);
      setSelectedReceipt(null);
      setReceiptDevices([]);
    
      if (selectedOrder) {
        openOrderDetail(selectedOrder);
      }
    }

    async function handleImportDevicesExcel() {
      if (!selectedReceipt || !devicesExcelFile) return;

      const formData = new FormData();
      formData.append('file', devicesExcelFile);

      await api.post(`/receipts/${selectedReceipt.id}/devices/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    
      setOpenDevicesReceipt(false);
      setSelectedReceipt(null);
      setReceiptDevices([]);
      setDevicesExcelFile(null);
    
      if (selectedOrder) {
        openOrderDetail(selectedOrder);
      }
    }

  return (
    <AppLayout>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Órdenes de compra
      </Typography>

      {canEdit && (
        <Button variant="contained" sx={{ mb: 2 }} onClick={() => setOpenCreate(true)}>
          Nueva orden
        </Button>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          select
          label="Filtrar por año"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">Todos los años</MenuItem>
          {years.map((y) => (
            <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </TextField>
        
        <Button variant="contained" onClick={loadOrders}>
          Buscar
        </Button>
        
        <Button variant="outlined" onClick={() => { setYearFilter(''); loadOrders(); }}>
          Limpiar
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
          <TableRow>
            <TableCell>Número</TableCell>
            <TableCell>Proveedor</TableCell>
            <TableCell>Fecha</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>Ampliación de</TableCell> 
            {canEdit && <TableCell>Acciones</TableCell>}
          </TableRow>
        </TableHead>

          <TableBody>
            {orders.map((order) => (
              <TableRow
                key={order.id}
                hover
                onDoubleClick={() => openOrderDetail(order)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>{order.number}</TableCell>
                <TableCell>{order.supplier?.name || '-'}</TableCell>
                <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                <TableCell>
                <Chip
                  label={
                    order.status === 'PENDIENTE' ? 'Pendiente' :
                    order.status === 'PARCIAL' ? 'Parcial' :
                    order.status === 'COMPLETA' ? 'Completa' :
                    order.status === 'ANULADA' ? 'Anulada' : '-'
                  }
                  color={
                    order.status === 'PENDIENTE' ? 'warning' :
                    order.status === 'PARCIAL' ? 'info' :
                    order.status === 'COMPLETA' ? 'success' :
                    order.status === 'ANULADA' ? 'error' : 'default'
                  }
                  size="small"
                />
              </TableCell>

              <TableCell>
                {order.parentOrder ? (
                  <Chip label={order.parentOrder.number} size="small" variant="outlined" />
                ) : '-'}
              </TableCell>

              {canEdit && (
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrder(order);
                      setOpenDelete(true);
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
      </Paper>

      
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)}>
        <DialogTitle>Nueva orden</DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Número Orden"
              fullWidth
              margin="normal"
              value={newOrder.orderNumber}
              onChange={(e) =>
                setNewOrder({ ...newOrder, orderNumber: e.target.value })
              }
            />
            <TextField
              select
              label="Año"
              fullWidth
              margin="normal"
              value={newOrder.year}
              onChange={(e) =>
                setNewOrder({ ...newOrder, year: e.target.value })
              }
            >
              {years.map((y) => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </TextField>
          </Box>
            
          <TextField
            select
            label="Proveedor"
            fullWidth
            margin="normal"
            value={newOrder.supplierId}
            onChange={(e) =>
              setNewOrder({ ...newOrder, supplierId: e.target.value })
            }
          >
            {suppliers.map((supplier) => (
              <MenuItem key={supplier.id} value={supplier.id}>
                {supplier.name}
              </MenuItem>
            ))}
          </TextField>
          
          <Box sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={newOrder.isAmpliation}
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, isAmpliation: e.target.checked, parentOrderId: '' })
                  }
                />
              }
              label="Es ampliación de otra orden"
            />
          </Box>
            
          {newOrder.isAmpliation && (
            <TextField
              select
              label="Orden original"
              fullWidth
              margin="normal"
              value={newOrder.parentOrderId}
              onChange={(e) =>
                setNewOrder({ ...newOrder, parentOrderId: e.target.value })
              }
            >
              {orders.map((order) => (
                <MenuItem key={order.id} value={order.id}>
                  {order.number} — {order.supplier?.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancelar</Button>

          <Button
            variant="contained"
            onClick={handleCreateOrder}
            disabled={!newOrder.orderNumber || !newOrder.supplierId}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Orden de compra {selectedOrder?.number}
        </DialogTitle>

        <DialogContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Ítems de la orden
          </Typography>

          {canEdit && (
            <Button
              variant="outlined"
              sx={{ mb: 2 }}
              onClick={openReceiptModal}
              disabled={items.length === 0}
            >
              Crear recepción
            </Button>
          )}

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell>Cantidad</TableCell>
                <TableCell>Precio unitario</TableCell>
                <TableCell>Notas</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.itemType}</TableCell>
                  <TableCell>
                    {item.itemType === 'DEVICE'
                      ? `${item.deviceModel?.brand} ${item.deviceModel?.model}`
                      : `${item.consumable?.name} ${item.consumable?.model}`}
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.unitPrice ?? '-'}</TableCell>
                  <TableCell>{item.notes || '-'}</TableCell>
                </TableRow>
              ))}

              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Sin ítems cargados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Recepciones
          </Typography>
                      
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Número</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Ítems recibidos</TableCell>
                <TableCell>Dispositivos</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
                      
            <TableBody>
              {receipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell>
                    {receipt.receiptNumber || `Recepción ${receipt.id}`}
                  </TableCell>
                  <TableCell>
                    {new Date(receipt.receivedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{receipt.items?.length ?? 0}</TableCell>
                  <TableCell>
                    {receipt.totalDevicesExpected && receipt.totalDevicesExpected > 0 ? (
                      receipt.devicesFullyLoaded ? (
                        <Typography
                          variant="body2"
                          color="success.main"
                          sx={{ fontWeight: 'bold' }}
                        >
                          ✓ Cargados ({receipt.devicesCreated}/{receipt.totalDevicesExpected})
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="warning.main">
                          {receipt.devicesCreated ?? 0}/{receipt.totalDevicesExpected} cargados
                        </Typography>
                      )
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No aplica
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {receiptHasDevices(receipt) && canEdit && !receipt.devicesFullyLoaded ? (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => openDevicesReceiptModal(receipt)}
                      >
                        Cargar devices
                      </Button>
                    ) : receipt.devicesFullyLoaded ? (
                      <Typography variant="body2" color="text.secondary">
                        Completo
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No aplica
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          
              {receipts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Sin recepciones
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
            
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Agregar ítem
          </Typography>
            
          <TextField
            select
            label="Tipo"
            fullWidth
            margin="normal"
            value={newItem.itemType}
            onChange={(e) =>
              setNewItem({
                ...newItem,
                itemType: e.target.value,
                deviceModelId: '',
                consumableId: '',
              })
            }
          >
            <MenuItem value="DEVICE">Dispositivo</MenuItem>
            <MenuItem value="CONSUMABLE">Consumible</MenuItem>
          </TextField>
          
          {newItem.itemType === 'DEVICE' && (
            <>
              <TextField
                select
                label="Categoría"
                fullWidth
                margin="normal"
                value={selectedItemCategoryId}
                onChange={(e) => {
                  setSelectedItemCategoryId(e.target.value);
                  setNewItem({ ...newItem, deviceModelId: '' });
                }}
              >
                <MenuItem value="">Todas</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </TextField>
              
              <TextField
                select
                label="Modelo de dispositivo"
                fullWidth
                margin="normal"
                value={newItem.deviceModelId}
                onChange={(e) =>
                  setNewItem({ ...newItem, deviceModelId: e.target.value })
                }
              >
                {filteredItemModels.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.brand} {model.model}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}
          
          {newItem.itemType === 'CONSUMABLE' && (
            <TextField
              select
              label="Consumible"
              fullWidth
              margin="normal"
              value={newItem.consumableId}
              onChange={(e) =>
                setNewItem({ ...newItem, consumableId: e.target.value })
              }
            >
              {consumables.map((consumable) => (
                <MenuItem key={consumable.id} value={consumable.id}>
                  {consumable.name} {consumable.model}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="Cantidad"
            type="number"
            fullWidth
            margin="normal"
            value={newItem.quantity}
            onChange={(e) =>
              setNewItem({ ...newItem, quantity: e.target.value })
            }
          />

          <TextField
            label="Precio unitario"
            type="number"
            fullWidth
            margin="normal"
            value={newItem.unitPrice}
            onChange={(e) =>
              setNewItem({ ...newItem, unitPrice: e.target.value })
            }
          />

          <TextField
            label="Notas"
            fullWidth
            margin="normal"
            value={newItem.notes}
            onChange={(e) =>
              setNewItem({ ...newItem, notes: e.target.value })
            }
          />
        </DialogContent>
          
        <DialogActions>
          <Button onClick={() => setOpenDetail(false)}>Cerrar</Button>
          
          {canEdit &&(
            <Button
              variant="contained"
              onClick={handleCreateItem}
              disabled={
                !newItem.quantity ||
                (newItem.itemType === 'DEVICE' && !newItem.deviceModelId) ||
                (newItem.itemType === 'CONSUMABLE' && !newItem.consumableId)
              }
            >
              Agregar ítem
            </Button>
            )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={openReceipt}
        onClose={() => setOpenReceipt(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Crear recepción</DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
            label="Número de remito"
            fullWidth
            margin="normal"
            value={newReceipt.receiptNumber}
            onChange={(e) =>
              setNewReceipt({ ...newReceipt, receiptNumber: e.target.value })
            }
            />
          

          <TextField
            label="Fecha de recepción"
            type="date"
            fullWidth
            margin="normal"
            value={newReceipt.receivedAt}
            onChange={(e) =>
              setNewReceipt({ ...newReceipt, receivedAt: e.target.value })
            }
            slotProps={{
              inputLabel: { shrink: true },
            }}
          />

          <TextField
            label="Notas"
	          fullWidth
            margin="normal"
            value={newReceipt.notes}
            onChange={(e) =>
              setNewReceipt({ ...newReceipt, notes: e.target.value })
            }
          />

          
          </Box>

          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Cantidades recibidas
          </Typography>
          
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell>Cantidad comprada</TableCell>
                <TableCell>Cantidad recibida ahora</TableCell>
              </TableRow>
            </TableHead>

	            <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.itemType}</TableCell>
                    <TableCell>
                      {item.itemType === 'DEVICE'
                        ? `${item.deviceModel?.brand} ${item.deviceModel?.model}`
                        : `${item.consumable?.name} ${item.consumable?.model}`}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={newReceipt.items[item.id] || ''}
                        onChange={(e) =>
                          setNewReceipt({
                            ...newReceipt,
                            items: {
                              ...newReceipt.items,
                              [item.id]: e.target.value,
                            },
                          })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
          </Table>
        </DialogContent>
            
        <DialogActions>
          <Button onClick={() => setOpenReceipt(false)}>Cancelar</Button>

         {canEdit && (   
          <Button
            variant="contained"
            onClick={handleCreateReceipt}
            disabled={
              Object.values(newReceipt.items).filter((q) => Number(q) > 0).length === 0
            }
          >
            Crear recepción
          </Button>
         )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDevicesReceipt}
        onClose={() => setOpenDevicesReceipt(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cargar dispositivos recibidos</DialogTitle>
                
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Recepción: {selectedReceipt?.receiptNumber}
          </Typography>
                
          {receiptDevices.map((serialNumber, index) => (
            <TextField
              key={index}
              label={`Serial ${index + 1}`}
              fullWidth
              margin="normal"
              value={serialNumber}
              onChange={(e) => {
                const copy = [...receiptDevices];
                copy[index] = e.target.value;
                setReceiptDevices(copy);
              }}
            />
          ))}

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            O importar desde Excel
          </Typography>

          <Button variant="outlined" component="label">
            Seleccionar archivo Excel
            <input
              type="file"
              hidden
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setDevicesExcelFile(file);
              }}
            />
          </Button>
            
          {devicesExcelFile && (
            <Typography sx={{ mt: 1 }}>
              Archivo seleccionado: {devicesExcelFile.name}
            </Typography>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setOpenDevicesReceipt(false)}>Cancelar</Button>
        
          <Button
            variant="contained"
            onClick={handleCreateDevicesFromReceipt}
            disabled={receiptDevices.some((serial) => serial.trim() === '')}
          >
            Guardar dispositivos
          </Button>

          <Button
            variant="outlined"
            onClick={handleImportDevicesExcel}
            disabled={!devicesExcelFile}
          >
            Importar Excel
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar orden de compra</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Confirmás que querés eliminar la orden{' '}
            <strong>{selectedOrder?.number}</strong>?
            No se puede eliminar si tiene ítems, recepciones o dispositivos asociados.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeleteOrder}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      
    </AppLayout>
  );
}