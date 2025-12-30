import { Controller, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async obtenerMisNotificaciones(@Request() req) {
    return await this.notificationService.obtenerNotificacionesUsuario(req.user.id);
  }

  @Patch(':id/leer')
  async marcarComoLeida(@Param('id') id: string) {
    await this.notificationService.marcarComoLeida(+id);
    return { message: 'Notificación marcada como leída' };
  }

  @Patch('leer-todas')
  async marcarTodasComoLeidas(@Request() req) {
    await this.notificationService.marcarTodasComoLeidas(req.user.id);
    return { message: 'Todas las notificaciones marcadas como leídas' };
  }
}
