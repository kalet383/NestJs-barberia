import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from 'src/auth/entities/user.entity';
import { Producto } from 'src/producto/entities/producto.entity';

export enum TipoPago {
  EFECTIVO = 'efectivo',
  TARJETA = 'tarjeta',
  TRANSFERENCIA = 'transferencia',
}

@Entity()
export class Venta {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'Id_Cliente' })
  cliente: User;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'Id_Barbero' })
  barbero?: User;

  @ManyToOne(() => Producto, { eager: true })
  @JoinColumn({ name: 'Id_Producto' })
  producto: Producto;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precioUnitario: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({
    type: 'enum',
    enum: TipoPago,
    default: TipoPago.EFECTIVO
  })
  tipoPago: TipoPago;

  @CreateDateColumn()
  fechaVenta: Date;

  @Column({ type: 'text', nullable: true })
  notas?: string;
}
