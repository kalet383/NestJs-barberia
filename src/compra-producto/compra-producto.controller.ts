import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CompraProductoService } from './compra-producto.service';
import { CreateCompraProductoDto } from './dto/create-compra-producto.dto';
import { UpdateCompraProductoDto } from './dto/update-compra-producto.dto';

@Controller('compra-producto')
@UseGuards(JwtAuthGuard, AdminGuard)
export class CompraProductoController {
  constructor(private readonly compraProductoService: CompraProductoService) {}

  @Post()
  create(@Body() createCompraProductoDto: CreateCompraProductoDto) {
    return this.compraProductoService.create(createCompraProductoDto);
  }

  @Get()
  findAll() {
    return this.compraProductoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.compraProductoService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCompraProductoDto: UpdateCompraProductoDto) {
    return this.compraProductoService.update(+id, updateCompraProductoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.compraProductoService.remove(+id);
  }
}
