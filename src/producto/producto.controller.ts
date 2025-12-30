import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PublicarProductoDto } from './dto/publicar-producto.dto';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ProductoService } from './producto.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Controller('producto')
export class ProductoController {
  constructor(private readonly productoService: ProductoService) {}

  @Post()
  create(@Body() createProductoDto: CreateProductoDto) {
    return this.productoService.create(createProductoDto);
  }

  @Get()
  findAll() {
    return this.productoService.findAll();
  }

  // Productos visibles en la tienda: publicados y con cantidad publicada > 0
  @Get('tienda')
  findPublished() {
    return this.productoService.findPublishedWithStock();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productoService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductoDto: UpdateProductoDto) {
    return this.productoService.update(+id, updateProductoDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/publicar')
  publicar(@Param('id') id: string, @Body() body: PublicarProductoDto) {
    return this.productoService.publishProduct(+id, body.cantidad);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/unpublicar')
  unpublicar(@Param('id') id: string) {
    return this.productoService.unpublishProduct(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productoService.remove(+id);
  }
}