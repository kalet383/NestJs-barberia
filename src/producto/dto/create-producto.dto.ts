import { IsNotEmpty, IsNumber, IsString, MaxLength, IsOptional, IsBoolean } from "class-validator";

export class CreateProductoDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    nombre: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(500)
    descripcion: string;

    @IsNotEmpty()
    @IsNumber()
    precio_venta: number;

    @IsOptional()
    @IsBoolean()
    publicado?: boolean;

    @IsOptional()
    @IsBoolean()
    en_oferta?: boolean;

    @IsOptional()
    @IsNumber()
    precio_oferta?: number;

    @IsOptional()
    @IsString()
    dias_oferta?: string;

    @IsOptional()
    @IsString()
    informacion_oferta?: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(8000)
    imagenUrl: string;

    @IsNotEmpty()
    @IsNumber()
    categoriaId: number;
} 