import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateDetalleCompraDto } from './dto/create-detalle-compra.dto';
import { UpdateDetalleCompraDto } from './dto/update-detalle-compra.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DetalleCompra } from './entities/detalle-compra.entity';
import { CompraProducto } from 'src/compra-producto/entities/compra-producto.entity';
import { Producto } from 'src/producto/entities/producto.entity';

@Injectable()
export class DetalleCompraService {
  constructor(
    @InjectRepository(DetalleCompra)
    private readonly detalleRepository: Repository<DetalleCompra>,

    @InjectRepository(CompraProducto)
    private readonly compraRepository: Repository<CompraProducto>,

    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
  ) {}

  async create(createDetalleCompraDto: CreateDetalleCompraDto) {
    const { id_compra, id_producto, cantidad, precio_compra } = createDetalleCompraDto as any;

    // Validaciones básicas
    const compra = await this.compraRepository.findOne({ where: { id_compra } });
    if (!compra) throw new NotFoundException('Compra no encontrada');

    const producto = await this.productoRepository.findOne({ where: { id: id_producto } });
    if (!producto) throw new NotFoundException('Producto no encontrado');

    if (cantidad <= 0) throw new BadRequestException('Cantidad debe ser mayor a 0');

    // Precio a usar (si no se envía, usamos precio_venta como referencia opcional)
    const precio = precio_compra ?? Number(producto.precio_venta);
    const subtotal = Number(cantidad) * Number(precio);

    // Usar transacción para consistencia
    await this.compraRepository.manager.transaction(async (manager) => {
      // Crear detalle
      const detalle = this.detalleRepository.create({
        compra,
        producto,
        cantidad,
        precio_compra: precio,
        subtotal: subtotal,
      } as any);

      await manager.save(detalle);

      // Actualizar stock
      producto.stock = Number(producto.stock) + Number(cantidad);
      await manager.save(producto);

      // Actualizar total de la compra
      compra.total = Number(compra.total || 0) + Number(subtotal);
      await manager.save(compra);
    });

    // Devolver la compra actualizada con detalles
    return this.compraRepository.findOne({ where: { id_compra } });
  }

  async findAll() {
    return await this.detalleRepository.find();
  }

  async findOne(id: number) {
    return await this.detalleRepository.findOne({ where: { id_detalle: id } });
  }

  async update(id: number, updateDetalleCompraDto: UpdateDetalleCompraDto) {
    await this.detalleRepository.update(id, updateDetalleCompraDto as any);
    return this.findOne(id);
  }

  async remove(id: number) {
    const detalle = await this.findOne(id);
    if (!detalle) throw new NotFoundException('Detalle no encontrado');

    // No permitir eliminar detalle si la compra está marcada como eliminada (historial conservado)
    const compraActual = await this.compraRepository.findOne({ where: { id_compra: detalle.compra.id_compra } });
    if (compraActual && compraActual.activo === false) {
      throw new BadRequestException('No se puede eliminar detalle de una compra eliminada');
    }

    // Revertir cambios en stock y total de compra
    await this.detalleRepository.manager.transaction(async (manager) => {
      const producto = await manager.findOne(Producto, { where: { id: detalle.producto.id } });
      const compra = await manager.findOne(CompraProducto, { where: { id_compra: detalle.compra.id_compra } });

      if (producto) {
        producto.stock = Number(producto.stock) - Number(detalle.cantidad);
        // Si la cantidad publicada excede el nuevo stock, ajustarla
        if (producto.cantidad_publicada > producto.stock) {
          producto.cantidad_publicada = Math.max(0, producto.stock);
          producto.publicado = producto.cantidad_publicada > 0;
        }
        await manager.save(producto);
      }

      if (compra) {
        compra.total = Number(compra.total) - Number(detalle.subtotal);
        await manager.save(compra);
      }

      await manager.delete(DetalleCompra, detalle.id_detalle);
    });

    return { success: true };
  }
}
