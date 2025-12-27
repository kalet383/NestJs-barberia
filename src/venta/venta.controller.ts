import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { VentaService } from './venta.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('venta')
@UseGuards(JwtAuthGuard)
export class VentaController {
  constructor(private readonly ventaService: VentaService) {}

  @Post()
  create(@Body() createVentaDto: CreateVentaDto) {
    return this.ventaService.create(createVentaDto);
  }

  @Post('bulk')
  createBulk(@Body() createVentaDtos: CreateVentaDto[]) {
    return this.ventaService.createBulk(createVentaDtos);
  }

  @Get()
  findAll() {
    return this.ventaService.findAll();
  }

  @Get('estadisticas')
  getEstadisticas(
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    const inicio = fechaInicio ? new Date(fechaInicio) : undefined;
    const fin = fechaFin ? new Date(fechaFin) : undefined;
    return this.ventaService.getEstadisticas(inicio, fin);
  }

  @Get('cliente/:id')
  findByCliente(@Param('id', ParseIntPipe) id: number) {
    return this.ventaService.findByCliente(id);
  }

  @Get('barbero/:id')
  findByBarbero(@Param('id', ParseIntPipe) id: number) {
    return this.ventaService.findByBarbero(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ventaService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ventaService.remove(id);
  }
}
