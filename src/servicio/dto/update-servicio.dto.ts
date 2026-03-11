import { IsString, IsNumber, Min, MaxLength, Matches, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateServicioDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    nombre?: string;

    @IsOptional()
    @IsString()
    descripcion?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    precio?: number;

    @IsOptional()
    @IsString()
    @Matches(/^([0-1]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, {
        message: 'duracionAprox must be in the format HH:mm:ss',
    })
    duracionAprox?: string;

    @IsOptional()
    @IsNumber()
    categoriaId?: number;

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
