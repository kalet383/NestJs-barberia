import { IsNotEmpty, IsEnum, IsOptional, IsString, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoPago } from '../entities/venta.entity';
import { ItemVentaDto } from './item-venta.dto';

export class CreateVentaDto {
  @IsNotEmpty()
  @IsNumber()
  clienteId: number;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemVentaDto)
  items: ItemVentaDto[];

  @IsNotEmpty()
  @IsEnum(TipoPago)
  tipoPago: TipoPago;

  @IsOptional()
  @IsString()
  direccionEnvio?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}
