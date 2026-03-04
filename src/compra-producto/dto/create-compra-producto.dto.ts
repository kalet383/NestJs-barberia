import { Type } from 'class-transformer';
import { ValidateNested, IsArray, IsDateString, IsNumber, IsNotEmpty } from 'class-validator';
import { CreateDetalleCompraDto } from '../../detalle-compra/dto/create-detalle-compra.dto';
import { IsOptional, IsString } from 'class-validator';

export class CreateCompraProductoDto {

    @IsDateString()
    fecha_compra: string; // Fecha de la compra

    @IsNumber()
    @IsNotEmpty()
    id_proveedor: number; // Proveedor al que se le compra

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateDetalleCompraDto)
    detalles: CreateDetalleCompraDto[]; // Array con los productos comprados

    @IsOptional()
    @IsString()
    estado?: string; // 'Pendiente' | 'Completada' | 'Cancelada'
}
