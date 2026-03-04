import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCompraProductoDto } from './dto/create-compra-producto.dto';
import { UpdateCompraProductoDto } from './dto/update-compra-producto.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompraProducto } from './entities/compra-producto.entity';
import { DetalleCompra } from 'src/detalle-compra/entities/detalle-compra.entity';
import { Producto } from 'src/producto/entities/producto.entity';
import { Proveedor } from 'src/proveedor/entities/proveedor.entity';

@Injectable()
export class CompraProductoService {
  constructor(
    @InjectRepository(CompraProducto)
    private readonly compraRepository: Repository<CompraProducto>,

    @InjectRepository(DetalleCompra)
    private readonly detalleRepository: Repository<DetalleCompra>,

    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,

    @InjectRepository(Proveedor)
    private readonly proveedorRepository: Repository<Proveedor>,
  ) {}

  async create(createCompraProductoDto: CreateCompraProductoDto) {
    const { fecha_compra, id_proveedor, detalles, estado = 'Pendiente' } = createCompraProductoDto;

    // Verificar que el proveedor existe
    const proveedor = await this.proveedorRepository.findOne({ where: { id: id_proveedor } });
    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    // Crear la compra
    const compra = this.compraRepository.create({
      fecha_compra,
      proveedor,
      estado,
      total: 0, // Se actualizará después de agregar los detalles
    });
    await this.compraRepository.save(compra);

    let totalCompra = 0;

    // Crear los detalles de la compra
    for (const detalle of (detalles || [])) {
      const { id_producto, cantidad, precio_compra } = detalle;

      // Verificar que el producto existe
      const producto = await this.productoRepository.findOne({ where: { id: id_producto } });
      if (!producto) {
        throw new Error(`Producto con ID ${id_producto} no encontrado`);
      }

      // Usar precio_compra enviado o precio_venta del producto como referencia
      const precio = precio_compra ?? Number(producto.precio_venta);
      const subtotal = Number(cantidad) * Number(precio);
      totalCompra += subtotal;

      const detalleData = {
        compra,
        precio_compra: precio,
        subtotal: subtotal,
        producto,
        cantidad,
      } as any;

      const detalleCompra = this.detalleRepository.create(detalleData);
      await this.detalleRepository.save(detalleCompra);

      // Actualizar stock del producto SOLO si el estado es Completada
      if (estado === 'Completada') {
        producto.stock = Number(producto.stock) + Number(cantidad);
        await this.productoRepository.save(producto);
      }
    }

    // actualizar el total de la compra y guardarlo
    compra.total = totalCompra;
    await this.compraRepository.save(compra);

    return compra;
  }

  async findAll() {
    return await this.compraRepository.find({ order: { fecha_compra: 'DESC' } });
  }

  async findOne(id: number) {
    const compra = await this.compraRepository.findOne({ where: { id_compra: id }, relations: ['detalles'] });
    if (!compra) {
      throw new NotFoundException(`Compra con ID ${id} no encontrada`);
    }
    return compra;
  }

  async update(id: number, updateCompraProductoDto: UpdateCompraProductoDto) {
    const compra = await this.findOne(id);
    const estadoAnterior = compra.estado;
    const nuevoEstado = updateCompraProductoDto.estado;

    await this.compraRepository.update(id, updateCompraProductoDto as any);

    if (nuevoEstado && nuevoEstado !== estadoAnterior) {
      const compraCompleta = await this.findOne(id);

      if (nuevoEstado === 'Completada') {
        // Increment stock
        for (const detalle of compraCompleta.detalles) {
          const producto = await this.productoRepository.findOne({ where: { id: detalle.producto.id } });
          if (producto) {
            producto.stock = Number(producto.stock) + Number(detalle.cantidad);
            await this.productoRepository.save(producto);
          }
        }
      } else if (estadoAnterior === 'Completada' && (nuevoEstado === 'Pendiente' || nuevoEstado === 'Cancelada')) {
        // Revert stock increment
        for (const detalle of compraCompleta.detalles) {
          const producto = await this.productoRepository.findOne({ where: { id: detalle.producto.id } });
          if (producto) {
            producto.stock = Math.max(0, Number(producto.stock) - Number(detalle.cantidad));
            await this.productoRepository.save(producto);
          }
        }
      }
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    // En lugar de eliminar físicamente, marcamos la compra como inactiva para conservar el historial
    const compra = await this.findOne(id);
    
    // Si se elimina una compra completada, revertir su impacto en stock
    if (compra.estado === 'Completada' && compra.activo) {
      for (const detalle of compra.detalles) {
        const producto = await this.productoRepository.findOne({ where: { id: detalle.producto.id } });
        if (producto) {
          producto.stock = Math.max(0, Number(producto.stock) - Number(detalle.cantidad));
          await this.productoRepository.save(producto);
        }
      }
    }

    compra.activo = false;
    await this.compraRepository.save(compra);
    return { success: true, mensaje: 'Compra marcada como eliminada. Historial conservado.' };
  }
}
