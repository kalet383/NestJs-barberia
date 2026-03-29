import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, TipoNotificacion } from './entities/notification.entity';
import { User, Role } from 'src/auth/entities/user.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async crearNotificacionNuevaVenta(ventaId: number, clienteNombre: string) {
    const admins = await this.userRepository.find({
      where: { role: Role.ADMINISTRADOR }
    });

    const notificaciones = admins.map(admin => 
      this.notificationRepository.create({
        tipo: TipoNotificacion.NUEVA_VENTA,
        mensaje: `Nueva venta realizada por ${clienteNombre}`,
        usuarioId: admin.id,
        ventaId,
        leida: false
      })
    );

    await this.notificationRepository.save(notificaciones);
  }

  async crearNotificacionCambioEstado(
    ventaId: number, 
    clienteId: number, 
    nuevoEstado: string
  ) {
    const notificacion = this.notificationRepository.create({
      tipo: TipoNotificacion.CAMBIO_ESTADO_VENTA,
      mensaje: `Tu venta #${ventaId} ha cambiado a estado: ${nuevoEstado}`,
      usuarioId: clienteId,
      ventaId,
      leida: false
    });

    await this.notificationRepository.save(notificacion);
  }

  async crearNotificacionVentaCancelada(
    ventaId: number, 
    clienteNombre: string
  ) {
    const admins = await this.userRepository.find({
      where: { role: Role.ADMINISTRADOR }
    });

    const notificaciones = admins.map(admin => 
      this.notificationRepository.create({
        tipo: TipoNotificacion.VENTA_CANCELADA,
        mensaje: `Venta #${ventaId} cancelada por ${clienteNombre}`,
        usuarioId: admin.id,
        ventaId,
        leida: false
      })
    );

    await this.notificationRepository.save(notificaciones);
  }

  async crearNotificacionNuevaCita(citaId: number, clienteNombre: string, barberoId: number) {
    const notifs: any[] = [];

    // Notificar al barbero asignado
    notifs.push(this.notificationRepository.create({
      tipo: TipoNotificacion.NUEVA_CITA,
      mensaje: `Nueva cita #${citaId} agendada por ${clienteNombre}`,
      usuarioId: barberoId,
      leida: false
    }));

    // Solo notificar a administradores (NO superadmin)
    const admins = await this.userRepository.find({ where: { role: Role.ADMINISTRADOR } });
    admins.forEach(admin => notifs.push(this.notificationRepository.create({
      tipo: TipoNotificacion.NUEVA_CITA,
      mensaje: `Nueva cita #${citaId} agendada por ${clienteNombre}`,
      usuarioId: admin.id,
      leida: false
    })));

    await this.notificationRepository.save(notifs);
  }

  async crearNotificacionCambioCita(citaId: number, clienteId: number, barberoId: number, nuevoEstado: string) {
    const notifs: any[] = [];

    // Notificar al cliente
    notifs.push(this.notificationRepository.create({
      tipo: TipoNotificacion.CAMBIO_ESTADO_CITA,
      mensaje: `Tu cita #${citaId} ha cambiado a: ${nuevoEstado}`,
      usuarioId: clienteId,
      leida: false
    }));

    // Notificar al barbero
    notifs.push(this.notificationRepository.create({
      tipo: TipoNotificacion.CAMBIO_ESTADO_CITA,
      mensaje: `La cita #${citaId} ha cambiado a: ${nuevoEstado}`,
      usuarioId: barberoId,
      leida: false
    }));

    await this.notificationRepository.save(notifs);
  }

  async crearNotificacionCitaCancelada(citaId: number, clienteNombre: string, barberoId: number) {
    const notifs: any[] = [];

    // Notificar al barbero asignado
    notifs.push(this.notificationRepository.create({
      tipo: TipoNotificacion.CITA_CANCELADA,
      mensaje: `Cita #${citaId} cancelada por ${clienteNombre}`,
      usuarioId: barberoId,
      leida: false
    }));

    // Solo notificar a administradores (NO superadmin)
    const admins = await this.userRepository.find({ where: { role: Role.ADMINISTRADOR } });
    admins.forEach(admin => notifs.push(this.notificationRepository.create({
      tipo: TipoNotificacion.CITA_CANCELADA,
      mensaje: `Cita #${citaId} cancelada por ${clienteNombre}`,
      usuarioId: admin.id,
      leida: false
    })));

    await this.notificationRepository.save(notifs);
  }

  async obtenerNotificacionesUsuario(usuarioId: number) {
    return await this.notificationRepository.find({
      where: { usuarioId },
      order: { createdAt: 'DESC' }
    });
  }

  async marcarComoLeida(notificacionId: number) {
    await this.notificationRepository.update(notificacionId, { leida: true });
  }

  async marcarTodasComoLeidas(usuarioId: number) {
    await this.notificationRepository.update(
      { usuarioId, leida: false },
      { leida: true }
    );
  }
}
