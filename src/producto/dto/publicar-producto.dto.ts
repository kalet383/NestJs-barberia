import { IsInt, Min } from 'class-validator';

export class PublicarProductoDto {
  @IsInt()
  @Min(1)
  cantidad: number;
}
