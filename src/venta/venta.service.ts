import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CreateVentaDto } from './dto/create-venta.dto';
import { UpdateVentaDto } from './dto/update-venta.dto';
import { Venta } from './entities/venta.entity';
import { User } from 'src/auth/entities/user.entity';
import { Producto } from 'src/producto/entities/producto.entity';

@Injectable()
export class VentaService {
  constructor(
    @InjectRepository(Venta)
    private ventaRepository: Repository<Venta>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Producto)
    private productoRepository: Repository<Producto>,
  ) {}

  async create(createVentaDto: CreateVentaDto) {
    const { clienteId, barberoId, productoId, cantidad, tipoPago, notas } = createVentaDto;

    // Verificar que el cliente existe
    const cliente = await this.userRepository.findOne({ where: { id: clienteId } });
    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${clienteId} no encontrado`);
    }

    // Verificar que el producto existe
    const producto = await this.productoRepository.findOne({ where: { id: productoId } });
    if (!producto) {
      throw new NotFoundException(`Producto con ID ${productoId} no encontrado`);
    }

    // Verificar stock disponible
    if (producto.stock < cantidad) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${producto.stock}, Solicitado: ${cantidad}`
      );
    }

    // Verificar barbero si se proporciona
    let barbero: User | undefined = undefined;
    if (barberoId) {
      const barberoFound = await this.userRepository.findOne({ where: { id: barberoId } });
      if (!barberoFound) {
        throw new NotFoundException(`Barbero con ID ${barberoId} no encontrado`);
      }
      barbero = barberoFound;
    }

    // Calcular total
    const precioUnitario = parseFloat(producto.precio.toString());
    const total = precioUnitario * cantidad;

    // Crear la venta
    const venta = this.ventaRepository.create({
      cliente,
      barbero: barbero || undefined,
      producto,
      cantidad,
      precioUnitario,
      total,
      tipoPago,
      notas,
    });

    const ventaGuardada = await this.ventaRepository.save(venta);

    // Actualizar stock del producto
    producto.stock -= cantidad;
    await this.productoRepository.save(producto);

    return {
      success: true,
      mensaje: 'Venta registrada exitosamente',
      venta: ventaGuardada,
    };
  }

  async findAll() {
    return await this.ventaRepository.find({
      relations: ['cliente', 'barbero', 'producto'],
      order: { fechaVenta: 'DESC' },
    });
  }

  async findOne(id: number) {
    const venta = await this.ventaRepository.findOne({
      where: { id },
      relations: ['cliente', 'barbero', 'producto'],
    });

    if (!venta) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada`);
    }

    return venta;
  }

  async findByCliente(clienteId: number) {
    return await this.ventaRepository.find({
      where: { cliente: { id: clienteId } },
      relations: ['cliente', 'barbero', 'producto'],
      order: { fechaVenta: 'DESC' },
    });
  }

  async findByBarbero(barberoId: number) {
    return await this.ventaRepository.find({
      where: { barbero: { id: barberoId } },
      relations: ['cliente', 'barbero', 'producto'],
      order: { fechaVenta: 'DESC' },
    });
  }

  async getEstadisticas(fechaInicio?: Date, fechaFin?: Date) {
    let ventas: Venta[];

    if (fechaInicio && fechaFin) {
      ventas = await this.ventaRepository.find({
        where: {
          fechaVenta: Between(fechaInicio, fechaFin),
        },
        relations: ['producto', 'cliente', 'barbero'],
      });
    } else {
      ventas = await this.ventaRepository.find({
        relations: ['producto', 'cliente', 'barbero'],
      });
    }

    const totalVentas = ventas.length;
    const ingresoTotal = ventas.reduce((sum, venta) => sum + parseFloat(venta.total.toString()), 0);
    const ventasPorTipoPago = ventas.reduce((acc, venta) => {
      acc[venta.tipoPago] = (acc[venta.tipoPago] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const productosMasVendidos = ventas.reduce((acc, venta) => {
      const nombreProducto = venta.producto.nombre;
      if (!acc[nombreProducto]) {
        acc[nombreProducto] = { cantidad: 0, ingresos: 0 };
      }
      acc[nombreProducto].cantidad += venta.cantidad;
      acc[nombreProducto].ingresos += parseFloat(venta.total.toString());
      return acc;
    }, {} as Record<string, { cantidad: number; ingresos: number }>);

    return {
      totalVentas,
      ingresoTotal: ingresoTotal.toFixed(2),
      ventasPorTipoPago,
      productosMasVendidos,
      promedioVenta: totalVentas > 0 ? (ingresoTotal / totalVentas).toFixed(2) : 0,
    };
  }

  async remove(id: number) {
    const venta = await this.findOne(id);
    
    // Devolver el stock al producto
    const producto = await this.productoRepository.findOne({ 
      where: { id: venta.producto.id } 
    });
    
    if (producto) {
      producto.stock += venta.cantidad;
      await this.productoRepository.save(producto);
    }

    await this.ventaRepository.remove(venta);
    
    return {
      success: true,
      mensaje: `Venta con ID ${id} eliminada y stock restaurado`,
    };
  }
}
