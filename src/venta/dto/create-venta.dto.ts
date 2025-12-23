import { IsNotEmpty, IsNumber, IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { TipoPago } from '../entities/venta.entity';

export class CreateVentaDto {
  @IsNotEmpty()
  @IsNumber()
  clienteId: number;

  @IsOptional()
  @IsNumber()
  barberoId?: number;

  @IsNotEmpty()
  @IsNumber()
  productoId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsNotEmpty()
  @IsEnum(TipoPago)
  tipoPago: TipoPago;

  @IsOptional()
  @IsString()
  notas?: string;
}
