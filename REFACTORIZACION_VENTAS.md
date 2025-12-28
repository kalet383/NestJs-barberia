# Refactorización del Sistema de Ventas

## Resumen de Cambios

Se ha refactorizado completamente el sistema de ventas para permitir vender múltiples productos en una sola venta, separando la información general de la venta de los detalles de cada producto.

## Cambios en la Base de Datos

### Tabla `venta` (Modificada)
**Eliminado:**
- `cantidad`
- `precioUnitario`
- `Id_Producto` (FK)

**Agregado:**
- `estado` (ENUM: PENDIENTE, PAGADA, CANCELADA)

**Mantenido:**
- `id` (PK)
- `fechaVenta`
- `total`
- `tipoPago` (ENUM: efectivo, tarjeta, transferencia)
- `notas`
- `Id_Cliente` (FK)
- `Id_Barbero` (FK, opcional)

### Tabla `detalle_venta` (Nueva)
- `id` (PK)
- `id_venta` (FK → venta.id)
- `id_producto` (FK → producto.id)
- `cantidad`
- `precioUnitario`
- `subtotal`

## Backend (NestJS)

### Entidades

#### Venta Entity
- Relación OneToMany con DetalleVenta
- Enum EstadoVenta: PENDIENTE, PAGADA, CANCELADA
- Enum TipoPago: efectivo, tarjeta, transferencia

#### DetalleVenta Entity
- Relación ManyToOne con Venta
- Relación ManyToOne con Producto
- Campos: cantidad, precioUnitario, subtotal

### DTOs

#### CreateVentaDto
```typescript
{
  clienteId: number;
  barberoId?: number;
  items: ItemVentaDto[];
  tipoPago: TipoPago;
  notas?: string;
}
```

#### ItemVentaDto
```typescript
{
  productoId: number;
  cantidad: number;
}
```

### Servicios

#### VentaService
- `create()`: Crea una venta con múltiples productos usando transacciones
- Valida stock antes de vender
- Calcula subtotales y total automáticamente
- Descuenta stock de productos
- `updateEstado()`: Actualiza el estado de una venta
- `remove()`: Elimina venta y restaura stock de todos los productos

#### DetalleVentaService
- CRUD completo para detalles de venta
- `findByVenta()`: Obtiene todos los detalles de una venta

### Endpoints

#### POST /venta
Crea una nueva venta con múltiples productos.

**Payload de ejemplo:**
```json
{
  "clienteId": 1,
  "barberoId": 2,
  "items": [
    {
      "productoId": 1,
      "cantidad": 2
    },
    {
      "productoId": 3,
      "cantidad": 1
    }
  ],
  "tipoPago": "efectivo",
  "notas": "Venta realizada en tienda física"
}
```

#### GET /venta
Obtiene todas las ventas con sus detalles.

#### GET /venta/:id
Obtiene una venta específica con sus detalles.

#### PATCH /venta/:id/estado
Actualiza el estado de una venta.

#### GET /venta/cliente/:id
Obtiene todas las ventas de un cliente.

#### GET /venta/barbero/:id
Obtiene todas las ventas atendidas por un barbero.

#### GET /venta/estadisticas
Obtiene estadísticas de ventas (con soporte para filtros de fecha).

#### DELETE /venta/:id
Elimina una venta y restaura el stock de todos los productos.

## Frontend (Vue 3)

### Store de Ventas
Actualizado para trabajar con el nuevo formato:
- Interface `Venta` ahora incluye `detalles: DetalleVenta[]`
- Interface `CreateVentaDto` ahora usa `items: ItemVentaDto[]`
- Método `createVenta()` actualizado para enviar el nuevo formato

### Componentes

#### DetallesCompra.vue
- Muestra lista de productos en el carrito
- Permite modificar cantidades
- Muestra subtotal y total
- Botón para proceder al checkout

#### CheckoutPage.vue
- Actualizado para enviar múltiples productos en un solo request
- Usa el nuevo formato con `items[]`

#### GestionVentas.vue
- Tabla actualizada para mostrar múltiples productos por venta
- Formulario permite agregar múltiples productos
- Muestra estado de venta
- Calcula total automáticamente

## Migración de Base de Datos

Ver archivo: `migrations/refactor_ventas.sql`

**IMPORTANTE:**
1. Hacer backup de la base de datos antes de ejecutar
2. La migración SQL migra datos existentes de `venta` a `detalle_venta`
3. Si TypeORM tiene `synchronize: true`, puede hacer los cambios automáticamente

## Consideraciones

1. **Transacciones**: El servicio de ventas usa transacciones para asegurar consistencia
2. **Validación de Stock**: Se valida antes de crear la venta
3. **Restauración de Stock**: Al eliminar una venta, se restaura el stock de todos los productos
4. **Estados**: Las ventas pueden estar en estado PENDIENTE, PAGADA o CANCELADA
5. **Barbero**: Es opcional, útil para ventas físicas donde un barbero atiende al cliente

## Ejemplo de Uso

### Crear una venta desde el frontend:

```typescript
const ventaStore = useVentaStore();

const payload = {
  clienteId: 1,
  barberoId: 2, // Opcional
  items: [
    { productoId: 1, cantidad: 2 },
    { productoId: 3, cantidad: 1 }
  ],
  tipoPago: 'efectivo',
  notas: 'Venta en tienda'
};

await ventaStore.createVenta(payload);
```

## Notas Finales

- El sistema ahora soporta ventas con múltiples productos de forma eficiente
- La estructura es escalable y permite futuras mejoras
- Se mantiene compatibilidad con el sistema de roles (superadmin, admin, barbero)
- Los barberos pueden ver sus propias ventas filtradas por `barberoId`

