import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentaService } from './venta.service';
import { VentaController } from './venta.controller';
import { Venta } from './entities/venta.entity';
import { User } from 'src/auth/entities/user.entity';
import { Producto } from 'src/producto/entities/producto.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, User, Producto]),
  ],
  controllers: [VentaController],
  providers: [VentaService],
  exports: [VentaService],
})
export class VentaModule {}
