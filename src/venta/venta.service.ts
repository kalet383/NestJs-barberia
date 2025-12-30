import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Venta, EstadoVenta } from './entities/venta.entity';
import { DetalleVenta } from 'src/detalle-venta/entities/detalle-venta.entity';
import { Producto } from 'src/producto/entities/producto.entity';
import { User, Role } from 'src/auth/entities/user.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { UpdateVentaDto } from './dto/update-venta.dto';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class VentaService {
  constructor(
    @InjectRepository(Venta)
    private ventaRepository: Repository<Venta>,
    @InjectRepository(DetalleVenta)
    private detalleVentaRepository: Repository<DetalleVenta>,
    @InjectRepository(Producto)
    private productoRepository: Repository<Producto>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
    private notificationService: NotificationService,
  ) {}

  async create(createVentaDto: CreateVentaDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verificar que el cliente existe
      const cliente = await this.userRepository.findOne({
        where: { id: createVentaDto.clienteId }
      });

      if (!cliente) {
        throw new NotFoundException('Cliente no encontrado');
      }

      // Crear la venta
      const venta = this.ventaRepository.create({
        clienteId: createVentaDto.clienteId,
        tipoPago: createVentaDto.tipoPago,
        direccionEnvio: createVentaDto.direccionEnvio,
        notas: createVentaDto.notas,
        estado: EstadoVenta.PENDIENTE,
        total: 0,
      });

      const ventaGuardada = await queryRunner.manager.save(venta);

      let totalVenta = 0;
      const detalles: DetalleVenta[] = [];

      // Procesar cada item
      for (const item of createVentaDto.items) {
        const producto = await queryRunner.manager.findOne(Producto, {
          where: { id: item.productoId }
        });

        if (!producto) {
          throw new NotFoundException(`Producto con ID ${item.productoId} no encontrado`);
        }

        // Verificar stock disponible
        if (producto.stock < item.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}, Solicitado: ${item.cantidad}`
          );
        }

        // Calcular subtotal
        const precioUnitario = producto.precio_venta;
        const subtotal = precioUnitario * item.cantidad;
        totalVenta += subtotal;

        // Crear detalle de venta
        const detalle = this.detalleVentaRepository.create({
          ventaId: ventaGuardada.id,
          productoId: producto.id,
          cantidad: item.cantidad,
          precioUnitario,
          subtotal,
        });

        detalles.push(detalle);

        // Descontar stock
        producto.stock -= item.cantidad;
        await queryRunner.manager.save(producto);
      }

      // Guardar detalles
      await queryRunner.manager.save(detalles);

      // Actualizar total de la venta
      ventaGuardada.total = totalVenta;
      await queryRunner.manager.save(ventaGuardada);

      await queryRunner.commitTransaction();

      // Crear notificación para admins y superadmins
      await this.notificationService.crearNotificacionNuevaVenta(
        ventaGuardada.id,
        `${cliente.nombre} ${cliente.apellido}`
      );

      // Retornar venta completa con relaciones
      return await this.ventaRepository.findOne({
        where: { id: ventaGuardada.id },
        relations: ['detalles', 'detalles.producto', 'cliente']
      });

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll() {
    return await this.ventaRepository.find({
      relations: ['detalles', 'detalles.producto', 'cliente'],
      order: { fechaVenta: 'DESC' }
    });
  }

  async findOne(id: number) {
    const venta = await this.ventaRepository.findOne({
      where: { id },
      relations: ['detalles', 'detalles.producto', 'cliente']
    });

    if (!venta) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada`);
    }

    return venta;
  }

  async findByCliente(clienteId: number) {
    return await this.ventaRepository.find({
      where: { clienteId },
      relations: ['detalles', 'detalles.producto'],
      order: { fechaVenta: 'DESC' }
    });
  }

  async update(id: number, updateVentaDto: UpdateVentaDto, userId: number, userRole: Role) {
    const venta = await this.findOne(id);

    // Solo admins y superadmins pueden cambiar el estado
    if (userRole !== Role.ADMINISTRADOR && userRole !== Role.SUPERADMIN) {
      throw new ForbiddenException('No tienes permisos para actualizar esta venta');
    }

    if (updateVentaDto.estado && updateVentaDto.estado !== venta.estado) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Si se cancela la venta y no estaba cancelada, devolver stock
        if (updateVentaDto.estado === EstadoVenta.CANCELADA && venta.estado !== EstadoVenta.CANCELADA) {
          for (const detalle of venta.detalles) {
            const producto = await queryRunner.manager.findOne(Producto, {
              where: { id: detalle.productoId }
            });

            if (producto) {
              producto.stock += detalle.cantidad;
              await queryRunner.manager.save(producto);
            }
          }
        }

        venta.estado = updateVentaDto.estado;
        // Usar manager del queryRunner para guardar
        await queryRunner.manager.save(venta);
        await queryRunner.commitTransaction();

        // Notificar al cliente del cambio de estado
        await this.notificationService.crearNotificacionCambioEstado(
          venta.id,
          venta.clienteId,
          updateVentaDto.estado
        );

      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    }

    return await this.findOne(id);
  }

  async cancelar(id: number, userId: number, userRole: Role) {
    const venta = await this.findOne(id);

    // Solo el cliente puede cancelar su propia venta
    if (userRole === Role.CLIENTE && venta.clienteId !== userId) {
      throw new ForbiddenException('No puedes cancelar esta venta');
    }

    // Solo se puede cancelar si está en estado PENDIENTE
    if (venta.estado !== EstadoVenta.PENDIENTE) {
      throw new BadRequestException('Solo se pueden cancelar ventas en estado PENDIENTE');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Devolver stock a los productos
      for (const detalle of venta.detalles) {
        const producto = await queryRunner.manager.findOne(Producto, {
          where: { id: detalle.productoId }
        });

        if (producto) {
          producto.stock += detalle.cantidad;
          await queryRunner.manager.save(producto);
        }
      }

      // Cambiar estado a CANCELADA
      venta.estado = EstadoVenta.CANCELADA;
      await queryRunner.manager.save(venta);

      await queryRunner.commitTransaction();

      // Notificar a admins
      await this.notificationService.crearNotificacionVentaCancelada(
        venta.id,
        `${venta.cliente.nombre} ${venta.cliente.apellido}`
      );

      return await this.findOne(id);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Estadísticas
  async obtenerEstadisticas(fechaInicio?: Date, fechaFin?: Date) {
    const whereCondition: any = {};

    if (fechaInicio && fechaFin) {
      whereCondition.fechaVenta = Between(fechaInicio, fechaFin);
    }

    const ventas = await this.ventaRepository.find({
      where: whereCondition,
      relations: ['detalles', 'detalles.producto']
    });

    const totalVentas = ventas.length;
    const totalIngresos = ventas
      .filter(v => v.estado !== EstadoVenta.CANCELADA)
      .reduce((sum, v) => sum + Number(v.total), 0);

    const ventasPorEstado = {
      pendientes: ventas.filter(v => v.estado === EstadoVenta.PENDIENTE).length,
      pagadas: ventas.filter(v => v.estado === EstadoVenta.PAGADA).length,
      entregadas: ventas.filter(v => v.estado === EstadoVenta.ENTREGADA).length,
      canceladas: ventas.filter(v => v.estado === EstadoVenta.CANCELADA).length,
    };

    // Productos más vendidos
    const productosVendidos = new Map<number, { nombre: string, cantidad: number, total: number }>();

    ventas
      .filter(v => v.estado !== EstadoVenta.CANCELADA)
      .forEach(venta => {
        venta.detalles.forEach(detalle => {
          const existing = productosVendidos.get(detalle.productoId);
          if (existing) {
            existing.cantidad += detalle.cantidad;
            existing.total += Number(detalle.subtotal);
          } else {
            productosVendidos.set(detalle.productoId, {
              nombre: detalle.producto.nombre,
              cantidad: detalle.cantidad,
              total: Number(detalle.subtotal)
            });
          }
        });
      });

    const productosMasVendidos = Array.from(productosVendidos.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);

    return {
      totalVentas,
      totalIngresos,
      ventasPorEstado,
      productosMasVendidos
    };
  }

  async obtenerVentasPorDia(fecha: Date) {
    const inicioDia = new Date(fecha);
    inicioDia.setHours(0, 0, 0, 0);

    const finDia = new Date(fecha);
    finDia.setHours(23, 59, 59, 999);

    return await this.ventaRepository.find({
      where: {
        fechaVenta: Between(inicioDia, finDia)
      },
      relations: ['detalles', 'detalles.producto', 'cliente']
    });
  }
}
