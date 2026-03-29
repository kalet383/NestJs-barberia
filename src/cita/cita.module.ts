import { Module } from '@nestjs/common';
import { CitaService } from './cita.service';
import { CitaController } from './cita.controller';
import { HorarioBarberoService } from 'src/horario-barbero/horario-barbero.service';
import { Cita } from './entities/cita.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Servicio } from 'src/servicio/entities/servicio.entity';
import { HorarioBarbero } from 'src/horario-barbero/entities/horario-barbero.entity';
import { HorarioBarberoModule } from 'src/horario-barbero/horario-barbero.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [HorarioBarberoModule, NotificationModule, TypeOrmModule.forFeature([Cita, Servicio, HorarioBarbero])],
  controllers: [CitaController],
  providers: [CitaService],
})
export class CitaModule {}
