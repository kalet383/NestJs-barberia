import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ServicioModule } from './servicio/servicio.module';
import { HorarioBarberoModule } from './horario-barbero/horario-barbero.module';

import { FranjaHorariaModule } from './franja-horaria/franja-horaria.module';
import { CitaModule } from './cita/cita.module';
import { ProductoModule } from './producto/producto.module';
import { CategoriaProductoModule } from './categoria-producto/categoria-producto.module';
import { ProveedorModule } from './proveedor/proveedor.module';
import { CompraProductoModule } from './compra-producto/compra-producto.module';
import { DetalleCompraModule } from './detalle-compra/detalle-compra.module';
import { CategoriaServicioModule } from './categoria-servicio/categoria-servicio.module';
import { VentaModule } from './venta/venta.module';
import { DetalleVentaModule } from './detalle-venta/detalle-venta.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT ?? '3306'),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      autoLoadEntities: true,
      synchronize: true, // Solo en desarrollo
    }),

    AuthModule,
    ServicioModule,
    HorarioBarberoModule,
    FranjaHorariaModule,
    CitaModule,
    ProductoModule,
    CategoriaProductoModule,
    ProveedorModule,
    CompraProductoModule,
    DetalleCompraModule,
    CategoriaServicioModule,
    VentaModule,
    DetalleVentaModule,
    NotificationModule,
  ],
})
export class AppModule {}
