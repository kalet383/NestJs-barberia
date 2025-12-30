import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  UseGuards, 
  Request,
  Query,
  ParseIntPipe
} from '@nestjs/common';
import { VentaService } from './venta.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { UpdateVentaDto } from './dto/update-venta.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/entities/user.entity';

@Controller('ventas')
@UseGuards(JwtAuthGuard)
export class VentaController {
  constructor(private readonly ventaService: VentaService) {}

  @Post()
  @Roles(Role.CLIENTE)
  @UseGuards(RolesGuard)
  async create(@Body() createVentaDto: CreateVentaDto, @Request() req) {
    // Asegurar que el cliente solo pueda crear ventas para sí mismo
    createVentaDto.clienteId = req.user.id;
    return await this.ventaService.create(createVentaDto);
  }

  @Get()
  @Roles(Role.ADMINISTRADOR, Role.SUPERADMIN)
  @UseGuards(RolesGuard)
  async findAll() {
    return await this.ventaService.findAll();
  }

  @Get('mis-ventas')
  @Roles(Role.CLIENTE)
  @UseGuards(RolesGuard)
  async findMisVentas(@Request() req) {
    return await this.ventaService.findByCliente(req.user.id);
  }

  @Get('estadisticas')
  @Roles(Role.ADMINISTRADOR, Role.SUPERADMIN)
  @UseGuards(RolesGuard)
  async obtenerEstadisticas(
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string
  ) {
    const inicio = fechaInicio ? new Date(fechaInicio) : undefined;
    const fin = fechaFin ? new Date(fechaFin) : undefined;
    return await this.ventaService.obtenerEstadisticas(inicio, fin);
  }

  @Get('por-dia')
  @Roles(Role.ADMINISTRADOR, Role.SUPERADMIN)
  @UseGuards(RolesGuard)
  async obtenerVentasPorDia(@Query('fecha') fecha: string) {
    return await this.ventaService.obtenerVentasPorDia(new Date(fecha));
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const venta = await this.ventaService.findOne(id);
    
    // Los clientes solo pueden ver sus propias ventas
    if (req.user.role === Role.CLIENTE && venta.clienteId !== req.user.id) {
      throw new Error('No tienes permiso para ver esta venta');
    }
    
    return venta;
  }

  @Patch(':id')
  @Roles(Role.ADMINISTRADOR, Role.SUPERADMIN)
  @UseGuards(RolesGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVentaDto: UpdateVentaDto,
    @Request() req
  ) {
    return await this.ventaService.update(id, updateVentaDto, req.user.id, req.user.role);
  }

  @Patch(':id/cancelar')
  @Roles(Role.CLIENTE)
  @UseGuards(RolesGuard)
  async cancelar(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return await this.ventaService.cancelar(id, req.user.id, req.user.role);
  }
}
