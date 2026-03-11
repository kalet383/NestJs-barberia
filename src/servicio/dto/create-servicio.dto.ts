import { IsString, IsNotEmpty, IsNumber, Min, MaxLength, Matches, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
export class CreateServicioDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    nombre: string;

    @IsString()
    @IsNotEmpty()
    descripcion: string;

    @IsNumber()
    @Min(0)
    precio: number;

    @IsString()
    @Matches(/^([0-1]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, {
        message: 'duracionAprox must be in the format HH:mm:ss',
    })
    duracionAprox: string;

    @IsNotEmpty()
    @IsNumber()
    categoriaId: number;

    @IsOptional()
    @IsBoolean()
    publicado?: boolean;

    @IsOptional()
    @IsBoolean()
    destacado?: boolean;

    @IsOptional()
    @Transform(({ value }) => value === null || value === '' ? null : value)
    imagenUrl?: string | null;

    @IsOptional()
    @Transform(({ value }) => value === null || value === '' ? null : value)
    videoUrl?: string | null;
}
