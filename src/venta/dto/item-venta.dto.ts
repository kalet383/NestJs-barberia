import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class ItemVentaDto {
  @IsNotEmpty()
  @IsNumber()
  productoId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  cantidad: number;
}

