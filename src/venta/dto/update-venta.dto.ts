import { IsEnum, IsOptional } from 'class-validator';
import { EstadoVenta } from '../entities/venta.entity';

export class UpdateVentaDto {
  @IsOptional()
  @IsEnum(EstadoVenta)
  estado?: EstadoVenta;
}
