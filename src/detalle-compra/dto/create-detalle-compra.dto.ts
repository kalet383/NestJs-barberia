import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateDetalleCompraDto {
    @IsNumber()
    @IsNotEmpty()
    id_compra: number;

    @IsNumber()
    @IsNotEmpty()
    id_producto: number;

    @IsNumber()
    @IsNotEmpty()
    cantidad: number;

    // precio_compra opcional: si no viene se usará el precio del producto (precio_venta como referencia)
    @IsNumber()
    precio_compra?: number;
}
