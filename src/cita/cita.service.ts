import { BadRequestException, Injectable, ForbiddenException } from '@nestjs/common';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';
import { UpdateEstadoCitaDto } from './dto/update-estado-cita.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Servicio } from 'src/servicio/entities/servicio.entity';
import { Repository, Between } from 'typeorm';
import { DiaSemana, HorarioBarbero } from 'src/horario-barbero/entities/horario-barbero.entity';
import { HorarioBarberoService } from 'src/horario-barbero/horario-barbero.service';
import { Cita, EstadoCita } from './entities/cita.entity';
import { Duration } from 'luxon';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class CitaService {
  constructor(
    @InjectRepository(Servicio)
    private readonly servicioRepository: Repository<Servicio>,

    @InjectRepository(Cita)
    private readonly citaRepository: Repository<Cita>,

    private readonly horarioBarberoService: HorarioBarberoService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(createCitaDto: CreateCitaDto) {
  const { clienteId, barberoId, servicioId, hora, fecha, estado } = createCitaDto;

  // Validar que la fecha no sea en el pasado
  const fechaHoy = new Date();
  const fechaCita = new Date(fecha + 'T' + hora);
  if (fechaCita < fechaHoy) {
    throw new BadRequestException('No se puede agendar una cita en el pasado');
  }

  // Verificar que el cliente existe
  const cliente = await this.citaRepository.manager.findOne('User', { where: { id: clienteId } });
  if (!cliente) {
    throw new BadRequestException(`Cliente con ID ${clienteId} no encontrado`);
  }

  // Verificar que el barbero existe
  const barbero = await this.citaRepository.manager.findOne('User', { where: { id: barberoId } });
  if (!barbero) {
    throw new BadRequestException(`Barbero con ID ${barberoId} no encontrado`);
  }

  // Validar que el barbero trabaje ese dia y hora
  const diaSemana = this.extraerDiaSemanaDelaFecha(fecha);
  if(!(await this.barberoTrabajaEnDiaYHora(barberoId, diaSemana, hora))) {
    throw new BadRequestException(`El barbero con ID ${barberoId} no trabaja el ${diaSemana} a las ${hora}`);
  }

  // ✅ NUEVO: Procesar cada servicio
  const citasCreadas: Cita[] = [];
  let horaActual = hora; // Hora de inicio para la primera cita

  for (const idServicio of servicioId) {
    // Verificar que el servicio existe
    const servicio = await this.servicioRepository.findOne({ where: { id: idServicio } });
    if (!servicio) {
      throw new BadRequestException(`Servicio con ID ${idServicio} no encontrado`);
    }

    // Calcular hora fin para este servicio
    const horaFin = this.sumTimes([horaActual, servicio.duracionAprox.toString()]);

    // Validar disponibilidad del barbero para este servicio
    const tieneConflictos = await this.barberoTieneCitasSolapadas(barberoId, fecha, horaActual, horaFin);

    if(tieneConflictos) {
      // Si hay conflictos, buscar alternativas
      const horariosSugeridos: string[] = [];
      const intervalos = [30, 60, 90]; // minutos después del horario original
      
      for(const minutosExtra of intervalos) {
        const nuevaHora = this.sumarMinutosAHora(hora, minutosExtra);
        const nuevaHoraFin = this.sumTimes([nuevaHora, servicio.duracionAprox.toString()]);
        const libre = !(await this.barberoTieneCitasSolapadas(barberoId, fecha, nuevaHora, nuevaHoraFin));
        if (libre) {
          horariosSugeridos.push(nuevaHora);
        }
      }

      // Buscar otros barberos en el mismo horario
      const otrosBarberosDisponibles = await this.obtenerBarberosDisponiblesParaCita(fecha, hora, idServicio);

      return {
        disponible: false,
        mensaje: `El barbero ${barberoId} no está disponible en el horario solicitado`,
        horarios_alternativos: horariosSugeridos,
        otros_barberos: otrosBarberosDisponibles.barberos_disponibles ?? [],
      };
    }

    // Crear la cita para este servicio
    const cita = this.citaRepository.create({
      cliente,
      barbero,
      servicio,
      hora: horaActual,
      fecha,
      estado: estado || 'PENDIENTE'
    });

    const citaGuardada = await this.citaRepository.save(cita);
    citasCreadas.push(citaGuardada);

    // ✅ Actualizar hora para el siguiente servicio (si hay más)
    horaActual = horaFin;
  }

  // Notificar al barbero y admins de cada cita creada
  if (citasCreadas.length > 0) {
    const primeraCita = citasCreadas[0];
    const clienteNombre = `${(cliente as any).nombre} ${(cliente as any).apellido || ''}`.trim();
    for (const cita of citasCreadas) {
      try {
        await this.notificationService.crearNotificacionNuevaCita(
          cita.id_cita,
          clienteNombre,
          barberoId
        );
      } catch (e) {
        console.warn('No se pudo crear notificación de cita:', e.message);
      }
    }
  }

  // Retornar todas las citas creadas
  return {
    disponible: true,
    mensaje: `${citasCreadas.length} cita(s) agendada(s) exitosamente`,
    citas: citasCreadas,
    total_citas: citasCreadas.length
  };
}

  async obtenerBarberosDisponiblesParaCita(fecha: Date, hora: string, idServicio: number) {
    try {
      console.log('=== DEBUG OBTENER BARBEROS DISPONIBLES ===');
      console.log('Parámetros recibidos:', { fecha, hora, idServicio });

      // 1. Extraer día de la semana de la fecha
      const diaSemana = this.extraerDiaSemanaDelaFecha(fecha);
      console.log('Día de la semana calculado:', diaSemana);
      
      // 2. Obtener duración del servicio
      const servicio = await this.servicioRepository.findOne({ where: { id: idServicio } });
      if (!servicio) {
        console.log(`Servicio con ID ${idServicio} no encontrado`);
        throw new Error(`Servicio con ID ${idServicio} no encontrado`);
      }
      console.log('Servicio encontrado:', servicio);

      // 3. Calcular rango de tiempo que ocuparía la nueva cita
      const horaFormateada = hora;
      const times = [hora.toString(), servicio.duracionAprox.toString()];
      const horaFin = this.sumTimes(times); 
      console.log('Hora inicio:', horaFormateada, 'Hora fin:', horaFin);

      // 4. Obtener barberos que tienen franjas disponibles para este día y hora
      const barberosConFranjas = await this.horarioBarberoService.buscarporDiayHora(diaSemana, horaFormateada);
      console.log('Barberos con franjas disponibles:', barberosConFranjas);
      
      // 5. Filtrar barberos que NO tengan citas que se solapen
      const barberosDisponibles: number[] = [];

      for (const data of barberosConFranjas) {
        console.log('Verificando barbero:', data);

        // CORRECCIÓN: Usar Id_RolBarbero en lugar de id
        const barberoId = data.id; // Soporte para ambos formatos
        console.log('ID del barbero extraído:', barberoId);

        const tieneCitasSolapadas = await this.barberoTieneCitasSolapadas(
          barberoId,
          fecha,
          horaFormateada,
          horaFin
        );

        console.log(`Barbero ${barberoId} tiene citas solapadas:`, tieneCitasSolapadas);

        if (!tieneCitasSolapadas) {
          barberosDisponibles.push(barberoId);
        }
      }


      console.log('Barberos disponibles finales:', barberosDisponibles);

      // CAMBIO PRINCIPAL: Retornar el objeto con el formato esperado
      if (barberosDisponibles.length > 0) {
        return {
          disponible: true,
          barbero_id: barberosDisponibles[0], // Primer barbero disponible
          barberos_disponibles: barberosDisponibles, // Todos los barberos disponibles
          total_disponibles: barberosDisponibles.length
        };
      } else {
        return {
          disponible: false,
          barbero_id: null,
          mensaje: 'No hay barberos disponibles para esta fecha y hora',
          barberos_disponibles: [],
          total_disponibles: 0
        };
      }

    } catch (error) {
      console.error('Error en obtenerBarberosDisponiblesParaCita:', error);
      return {
        disponible: false,
        barbero_id: null,
        error: error.message,
        barberos_disponibles: [],
        total_disponibles: 0
      };
    }
  }

  // Detectar si el barbero trabaja en ese dia y hora
  private async barberoTrabajaEnDiaYHora(barberoId: number, diaSemana: DiaSemana, hora: string): Promise<boolean> {
    const horarios = await this.horarioBarberoService.buscarporDiayHora(diaSemana, hora);
    return horarios.some(horario => horario.id === barberoId);
  }

  sumTimes(timeStrings: string[]): string {
    let totalMinutes = 0;

    for (const time of timeStrings) {
      if (!time) continue;
      const parts = time.split(':').map(Number);
      const h = parts[0] || 0;
      const m = parts[1] || 0;
      const s = parts[2] || 0;
      totalMinutes += h * 60 + m + s / 60;
    }

    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.floor(totalMinutes % 60);
    const secs = Math.round((totalMinutes % 1) * 60);

    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Verifica si un barbero tiene citas que se solapen con el rango de tiempo dado
   * @param idBarbero - ID del barbero
   * @param fecha - Fecha a verificar
   * @param horaInicio - Hora de inicio del rango
   * @param horaFin - Hora de fin del rango
   * @returns true si hay solapamiento, false si no hay conflictos
   */
  private async barberoTieneCitasSolapadas(
    idBarbero: number,
    fecha: Date,
    horaInicio: string,
    horaFin: string
  ): Promise<boolean> {
    const citasDelDia = await this.citaRepository
      .createQueryBuilder('cita')
      .innerJoinAndSelect('cita.servicio', 'servicio')
      .where('cita.Id_RolBarbero = :idBarbero', { idBarbero })
      .andWhere('cita.fecha = :fecha', { fecha })
      .andWhere('cita.estado != :estadoCancelado', { estadoCancelado: EstadoCita.CANCELADA })
      .getMany();

    // Verificar si alguna cita existente se solapa con el nuevo rango
    for (const cita of citasDelDia) {
      const citaHoraInicio = cita.hora.toString();

      const times = [citaHoraInicio.toString(), cita.servicio.duracionAprox.toString()];
      const citaHoraFin = this.sumTimes(times); 

      //const citaHoraFin = this.sumarMinutosAHora(citaHoraInicio, cita.servicio.duracionAprox);

      if (this.verificarSolapamientoHorarios(horaInicio, horaFin, citaHoraInicio, citaHoraFin)) {
        return true; // Hay solapamiento
      }
    }
    return false; // No hay conflictos
  }

  /**
   * Verifica si dos rangos de tiempo se solapan
   * @param inicio1 - Hora de inicio del primer rango
   * @param fin1 - Hora de fin del primer rango
   * @param inicio2 - Hora de inicio del segundo rango
   * @param fin2 - Hora de fin del segundo rango
   * @returns true si hay solapamiento, false si no
   */
  private verificarSolapamientoHorarios(
    inicio1: string,
    fin1: string,
    inicio2: string,
    fin2: string
  ): boolean {
    // Convertir horas a minutos para facilitar la comparación
    const inicio1Min = this.horaAMinutos(inicio1);
    const fin1Min = this.horaAMinutos(fin1);
    const inicio2Min = this.horaAMinutos(inicio2);
    const fin2Min = this.horaAMinutos(fin2);

    // Verificar solapamiento: (inicio1 < fin2) AND (inicio2 < fin1)
    return (inicio1Min < fin2Min) && (inicio2Min < fin1Min);
  }

  /**
   * Convierte una hora en formato HH:MM:SS a minutos desde las 00:00
   * @param hora - Hora en formato HH:MM:SS
   * @returns Número de minutos desde las 00:00
   */
  private horaAMinutos(hora: string): number {
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos;
  }

  /**
   * Suma minutos a una hora y devuelve la nueva hora
   * @param hora - Hora inicial en formato HH:MM:SS
   * @param minutos - Minutos a sumar
   * @returns Nueva hora en formato HH:MM:SS
   */

  private sumarMinutosAHora(hora: string, minutos: number): string {
    const totalMinutos = this.horaAMinutos(hora) + minutos;
    const horas = Math.floor(totalMinutos / 60);
    const mins = totalMinutos % 60;
    
    // Formatear con ceros a la izquierda
    const horasStr = horas.toString().padStart(2, '0');
    const minsStr = mins.toString().padStart(2, '0');
    
    return `${horasStr}:${minsStr}:00`;
  }

  /**
   * Extrae el día de la semana de una fecha
   * @param fecha - Fecha en formato YYYY-MM-DD
   * @returns Día de la semana como enum DiaSemana
   */
  private extraerDiaSemanaDelaFecha(fecha: any): DiaSemana {
    // Si es un objeto Date, convertirlo a string YYYY-MM-DD para evitar desfases de zona horaria
    const fechaStr = fecha instanceof Date ? fecha.toISOString().split('T')[0] : String(fecha);
    const fechaObj = new Date(fechaStr + 'T00:00:00'); 
    const numeroDia = fechaObj.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    
    const mapeosDias: Record<number, DiaSemana> = {
      1: DiaSemana.LUNES,
      2: DiaSemana.MARTES,
      3: DiaSemana.MIERCOLES,
      4: DiaSemana.JUEVES,
      5: DiaSemana.VIERNES,
      6: DiaSemana.SABADO,
      0: DiaSemana.DOMINGO
    };

    return mapeosDias[numeroDia];
  }

    /**
   * Actualiza el estado de una cita
   * @param id - ID de la cita
   * @param updateEstadoDto - DTO con el nuevo estado
   * @returns Cita actualizada
   */
  async actualizarEstado(id: number, updateEstadoDto: UpdateEstadoCitaDto) {
    const cita = await this.findOne(id);

    // Validar que la cita esté en estado "agendada" para poder cancelarla
    if (updateEstadoDto.estado === 'cancelada' && cita.estado !== 'agendada') {
      throw new BadRequestException(
        'Solo se pueden cancelar citas con estado "agendada"'
      );
    }

    // Validar tiempo de anticipación para cancelaciones (2 horas)
    if (updateEstadoDto.estado === 'cancelada') {
      const ahora = new Date();
      const fechaHoraCita = new Date(`${cita.fecha}T${cita.hora}`);
      const diferenciaHoras = (fechaHoraCita.getTime() - ahora.getTime()) / (1000 * 60 * 60);

      if (diferenciaHoras < 2) {
        throw new ForbiddenException(
          'No se puede cancelar una cita con menos de 2 horas de anticipación. ' +
          'Por favor, contacta directamente con la barbería.'
        );
      }
    }

    // Actualizar el estado
    cita.estado = updateEstadoDto.estado;
    const citaActualizada = await this.citaRepository.save(cita);

    // Notificar cambio de estado (si tiene cliente y barbero cargados)
    try {
      const clienteId = (citaActualizada as any).clienteId || (citaActualizada.cliente as any)?.id;
      const barberoId = (citaActualizada as any).barberoId || (citaActualizada.barbero as any)?.id;
      
      if (clienteId && barberoId) {
        if (updateEstadoDto.estado === EstadoCita.CANCELADA) {
          const cliente = citaActualizada.cliente as any;
          const clienteNombre = cliente ? `${cliente.nombre} ${cliente.apellido || ''}`.trim() : 'Cliente';
          await this.notificationService.crearNotificacionCitaCancelada(id, clienteNombre, barberoId);
        } else {
          await this.notificationService.crearNotificacionCambioCita(id, clienteId, barberoId, updateEstadoDto.estado);
        }
      }
    } catch (e) {
      console.warn('No se pudo crear notificación de cambio de cita:', e.message);
    }

    return {
      success: true,
      mensaje: `Cita ${updateEstadoDto.estado} exitosamente`,
      cita: citaActualizada
    };
  }

  /**
   * Cancelar una cita (método conveniente)
   * @param id - ID de la cita
   * @returns Cita cancelada
   */
  async cancelarCita(id: number) {
    return this.actualizarEstado(id, { estado: EstadoCita.CANCELADA });
  }

  /**
   * Completar una cita (método conveniente para barberos/admin)
   * @param id - ID de la cita
   * @returns Cita completada
   */
  async completarCita(id: number) {
    const cita = await this.findOne(id);
    
    // Validar que la cita esté agendada
    if (cita.estado !== 'agendada') {
      throw new BadRequestException(
        'Solo se pueden completar citas con estado "agendada"'
      );
    }

    return this.actualizarEstado(id, { estado: EstadoCita.COMPLETADA });
  }

  /**
 * Obtiene las horas ocupadas de un barbero en una fecha específica
 * @param barberoId - ID del barbero
 * @param fecha - Fecha en formato YYYY-MM-DD
 * @returns Array de horas ocupadas con sus rangos
 */
  async obtenerHorasOcupadasBarbero(barberoId: number, fecha: string) {
      try {
      // Obtener todas las citas del barbero en esa fecha
      const citas = await this.citaRepository
        .createQueryBuilder('cita')
        .innerJoinAndSelect('cita.servicio', 'servicio')
        .where('cita.Id_RolBarbero = :barberoId', { barberoId })
        .andWhere('cita.fecha = :fecha', { fecha })
        .andWhere('cita.estado != :estadoCancelada', { estadoCancelada: 'cancelada' }) // Excluir canceladas
        .getMany();

      // Calcular rangos de tiempo ocupados
      const horasOcupadas = citas.map(cita => {
        const horaInicio = cita.hora.toString();
        const horaFin = this.sumTimes([horaInicio, cita.servicio.duracionAprox.toString()]);
        
        return {
          horaInicio,
          horaFin,
          citaId: cita.id_cita
        };
      });

      return {
        barberoId,
        fecha,
        horasOcupadas,
        totalCitas: horasOcupadas.length
      };
    } catch (error) {
      console.error('Error al obtener horas ocupadas:', error);
      throw new BadRequestException('Error al consultar disponibilidad del barbero');
    }
  }

  async obtenerEstadisticas(fechaInicio?: Date, fechaFin?: Date) {
    const whereCondition: any = {};
    if (fechaInicio && fechaFin) {
      whereCondition.fecha = Between(fechaInicio, fechaFin);
    }

    const citas = await this.citaRepository.find({
      where: whereCondition,
      relations: ['servicio']
    });

    const totalCitas = citas.length;

    const citasPorEstado = {
      pendientes: citas.filter(c => c.estado === EstadoCita.AGENDADA).length,
      completadas: citas.filter(c => c.estado === EstadoCita.COMPLETADA).length,
      canceladas: citas.filter(c => c.estado === EstadoCita.CANCELADA).length,
    };

    const serviciosCount = new Map<number, { nombre: string, cantidad: number }>();
    citas.forEach(cita => {
      if (cita.servicio) {
        // Asume que la entidad Servicio tiene una propiedad "id"
        const existing = serviciosCount.get((cita.servicio as any).id || (cita.servicio as any).id_servicio);
        if (existing) {
          existing.cantidad++;
        } else {
          serviciosCount.set((cita.servicio as any).id || (cita.servicio as any).id_servicio, {
            nombre: cita.servicio.nombre,
            cantidad: 1
          });
        }
      }
    });

    const serviciosMasSolicitados = Array.from(serviciosCount.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);

    return {
      totalCitas,
      citasPorEstado,
      serviciosMasSolicitados
    };
  }

  async findAll() {
    return await this.citaRepository.find({ relations: ['cliente', 'barbero', 'servicio'] });
  }

  async findOne(id: number): Promise<Cita> {
    const cita = await this.citaRepository.findOne({ where: { id_cita: id }, relations: ['cliente', 'barbero', 'servicio'] });
    if (!cita) {
      throw new Error(`Cita con id ${id} no encontrada`);
    }
    return cita;
  }

  update(id: number, updateCitaDto: UpdateCitaDto) {
    return `This action updates a #${id} cita`;
  }

  async remove(id: number) {
    const cita = await this.findOne(id);
    await this.citaRepository.remove(cita);
    return `Cita con id ${id} eliminada correctamente`;
  }
}
