import { Module } from '@nestjs/common';
import { DetalleCompraService } from './detalle-compra.service';
import { DetalleCompraController } from './detalle-compra.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetalleCompra } from './entities/detalle-compra.entity';
import { CompraProducto } from 'src/compra-producto/entities/compra-producto.entity';
import { Producto } from 'src/producto/entities/producto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DetalleCompra, CompraProducto, Producto])],
  controllers: [DetalleCompraController],
  providers: [DetalleCompraService],
  exports: [TypeOrmModule, DetalleCompraService],
})
export class DetalleCompraModule {}
