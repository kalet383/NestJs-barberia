import { Injectable, UnauthorizedException, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, User } from './entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { HorarioBarbero } from 'src/horario-barbero/entities/horario-barbero.entity';
import { FranjaHoraria } from 'src/franja-horaria/entities/franja-horaria.entity';

export class CreateBarberWithScheduleDto {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  telefono: string;
  foto?: string;
  horarios: Array<{
    diasemana: string;
    idFranja: number;
  }>;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(HorarioBarbero)
    private readonly horarioBarberoRepository: Repository<HorarioBarbero>,
    @InjectRepository(FranjaHoraria)
    private readonly franjaHorariaRepository: Repository<FranjaHoraria>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<User> {
    const { email, password, nombre, apellido, telefono, foto,  role } = registerDto;
    
    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Este Email ya existe');
    }

    const users = await this.usersRepository.find();

    for (const user of users) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        throw new BadRequestException('Esta contraseña ya está en uso por otro usuario, por favor elija otra');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      nombre,
      apellido,
      telefono,
      foto,
      role,
      activo: true
    });

    return await this.usersRepository.save(user);
  }

  async registerBarberWithSchedule(
    createBarberWithScheduleDto: CreateBarberWithScheduleDto,
  ) {
    const { horarios, email, password, nombre, apellido, telefono, foto } = createBarberWithScheduleDto;

    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Este Email ya existe');
    }

    const users = await this.usersRepository.find();

    for (const user of users) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        throw new BadRequestException('Esta contraseña ya está en uso por otro usuario, por favor elija otra');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const barber = this.usersRepository.create({
      email,
      password: hashedPassword,
      nombre,
      apellido,
      telefono,
      foto,
      role: Role.BARBERO,
      activo: true
    });

    const savedBarber = await this.usersRepository.save(barber);

    // Crear horarios para el barbero
    if (horarios && horarios.length > 0) {
      try {
        const horariosGuardados: HorarioBarbero[] = [];

        for (const horario of horarios) {
          // Obtener la entidad FranjaHoraria completa
          const franja = await this.franjaHorariaRepository.findOne({
            where: { id_franja: horario.idFranja },
          });

          if (!franja) {
            throw new BadRequestException(
              `La franja horaria con ID ${horario.idFranja} no existe`,
            );
          }

          // Crear el horario con la franja completa
          const nuevoHorario = this.horarioBarberoRepository.create({
            barbero: savedBarber,
            Dia_semana: horario.diasemana as any,
            franja: franja,
          });

          const horarioGuardado = await this.horarioBarberoRepository.save(
            nuevoHorario,
          );
          horariosGuardados.push(horarioGuardado);
        }

        return {
          barbero: savedBarber,
          horarios: horariosGuardados,
          message: 'Barbero y horarios creados exitosamente',
        };
      } catch (error) {
        console.error('Error al crear horarios:', error);
        throw new BadRequestException(
          'Error al crear los horarios del barbero: ' + error.message,
        );
      }
    }

    return {
      barbero: savedBarber,
      horarios: [],
      message: 'Barbero creado exitosamente sin horarios',
    };
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string; user: any }> {
    const { email, password } = loginDto;
    
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Payload del token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        Role: user.role,
      },
    };
  }

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<User> {
    const cliente = await this.usersRepository.findOne({
      where: { id },
    });
  
    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
  
    return cliente;
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
    return `Usuario con id ${id} eliminado satisfactoriamente`;
  }

  async findUserById(id: number) {
    return this.usersRepository.findOne({ where: { id } });
  }

  // ============ MÉTODOS SUPERADMIN ============

  /**
   * Actualizar información de un usuario (solo superadmin)
   */
  async updateUser(id: number, updateDto: Partial<RegisterDto>) {
    const user = await this.findOne(id);

    // Si se actualiza el email, verificar que no exista
    if (updateDto.email && updateDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({ 
        where: { email: updateDto.email } 
      });
      if (existingUser) {
        throw new BadRequestException('Este Email ya está en uso');
      }
    }

    // Si se actualiza la contraseña, hashearla
    if (updateDto.password) {
      updateDto.password = await bcrypt.hash(updateDto.password, 10);
    }

    // Actualizar campos
    Object.assign(user, updateDto);
    const updatedUser = await this.usersRepository.save(user);

    return {
      success: true,
      mensaje: 'Usuario actualizado exitosamente',
      user: updatedUser,
    };
  }

  /**
   * Activar/Desactivar usuario (dar de baja)
   */
  async toggleUserStatus(id: number) {
    const user = await this.findOne(id);
    
    user.activo = !user.activo;
    const updatedUser = await this.usersRepository.save(user);

    return {
      success: true,
      mensaje: `Usuario ${updatedUser.activo ? 'activado' : 'desactivado'} exitosamente`,
      user: updatedUser,
    };
  }

  /**
   * Obtener usuarios por rol
   */
  async getUsersByRole(role: Role) {
    const users = await this.usersRepository.find({
      where: { role },
      order: { createdAt: 'DESC' },
    });

    return {
      role,
      total: users.length,
      users,
    };
  }

  /**
   * Obtener estadísticas generales del sistema
   */
  async getStatistics() {
    const totalUsers = await this.usersRepository.count();
    const activeUsers = await this.usersRepository.count({ where: { activo: true } });
    const inactiveUsers = await this.usersRepository.count({ where: { activo: false } });

    const adminCount = await this.usersRepository.count({ where: { role: Role.ADMINISTRADOR } });
    const barberCount = await this.usersRepository.count({ where: { role: Role.BARBERO } });
    const clientCount = await this.usersRepository.count({ where: { role: Role.CLIENTE } });
    const superadminCount = await this.usersRepository.count({ where: { role: Role.SUPERADMIN } });

    // Usuarios recientes (últimos 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentUsers = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :date', { date: sevenDaysAgo })
      .getCount();

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole: {
        superadmin: superadminCount,
        administrador: adminCount,
        barbero: barberCount,
        cliente: clientCount,
      },
      recentUsers,
      statistics: {
        activePercentage: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(2) : 0,
        inactivePercentage: totalUsers > 0 ? ((inactiveUsers / totalUsers) * 100).toFixed(2) : 0,
      },
    };
  }
}
