import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CitaService } from './cita.service';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';
import { UpdateEstadoCitaDto } from './dto/update-estado-cita.dto';
import { DiaSemana } from 'src/horario-barbero/entities/horario-barbero.entity';

@Controller('cita')
export class CitaController {
  constructor(private readonly citaService: CitaService) {}

  @Post()
  create(@Body() createCitaDto: CreateCitaDto) {
    return this.citaService.create(createCitaDto);
  }

  @Get()
  findAll() {
    return this.citaService.findAll();
  }

  @Get('estadisticas')
  async obtenerEstadisticas(
    @Query('inicio') inicio?: string,
    @Query('fin') fin?: string,
  ) {
    const fechaInicio = inicio ? new Date(inicio) : undefined;
    let fechaFin = fin ? new Date(fin) : undefined;
    
    // Si hay fecha final, ajustarla para cubrir todo el día (23:59:59)
    if (fechaFin) {
      fechaFin.setHours(23, 59, 59, 999);
    }

    return await this.citaService.obtenerEstadisticas(fechaInicio, fechaFin);
  }

  // ✅ Rutas específicas primero
  @Get('barbero/:barberoId/ocupadas/:fecha')
  async obtenerHorasOcupadasBarbero(
    @Param('barberoId') barberoId: string,
    @Param('fecha') fecha: string
  ) {
    return this.citaService.obtenerHorasOcupadasBarbero(+barberoId, fecha);
  }

  @Get(':fecha/:hora/:idservicio')
  findhorario(
    @Param('fecha') fecha: Date, 
    @Param('hora') hora: string, 
    @Param('idservicio') idservicio: string
  ) {
    return this.citaService.obtenerBarberosDisponiblesParaCita(fecha, hora, +idservicio);
  }

  // ✅ Ruta genérica :id al final de los GET
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.citaService.findOne(+id);
  }

  // PATCH están bien, porque son más específicos
  @Patch(':id/estado')
  actualizarEstado(
    @Param('id') id: string, 
    @Body() updateEstadoDto: UpdateEstadoCitaDto
  ) {
    return this.citaService.actualizarEstado(+id, updateEstadoDto);
  }

  @Patch(':id/cancelar')
  cancelarCita(@Param('id') id: string) {
    return this.citaService.cancelarCita(+id);
  }

  @Patch(':id/completar')
  completarCita(@Param('id') id: string) {
    return this.citaService.completarCita(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCitaDto: UpdateCitaDto) {
    return this.citaService.update(+id, updateCitaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.citaService.remove(+id);
  }
}