import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '../entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    if (user.role !== Role.ADMINISTRADOR && user.role !== Role.SUPERADMIN) {
      throw new ForbiddenException('Acceso denegado. Se requiere rol de Administrador o Super Administrador');
    }

    return true;
  }
}
