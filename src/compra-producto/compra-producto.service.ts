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
    const { fecha_compra, id_proveedor, detalles } = createCompraProductoDto;

    // Verificar que el proveedor existe
    const proveedor = await this.proveedorRepository.findOne({ where: { id: id_proveedor } });
    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    // Crear la compra
    const compra = this.compraRepository.create({
      fecha_compra,
      proveedor,
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

      // Actualizar stock del producto
      producto.stock = Number(producto.stock) + Number(cantidad);
      await this.productoRepository.save(producto);
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
    await this.compraRepository.update(id, updateCompraProductoDto as any);
    return this.findOne(id);
  }

  async remove(id: number) {
    // En lugar de eliminar físicamente, marcamos la compra como inactiva para conservar el historial
    const compra = await this.findOne(id);
    compra.activo = false;
    await this.compraRepository.save(compra);
    return { success: true, mensaje: 'Compra marcada como eliminada. Historial conservado.' };
  }
}
