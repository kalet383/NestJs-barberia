import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  ManyToOne, 
  JoinColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  OneToMany 
} from 'typeorm';
import { User } from 'src/auth/entities/user.entity';
import { DetalleVenta } from 'src/detalle-venta/entities/detalle-venta.entity';

export enum EstadoVenta {
  PENDIENTE = 'PENDIENTE',
  PAGADA = 'PAGADA',
  CANCELADA = 'CANCELADA',
  ENTREGADA = 'ENTREGADA',
}

export enum TipoPago {
  EFECTIVO = 'EFECTIVO',
  PAGO_CONTRA_ENTREGA = 'PAGO_CONTRA_ENTREGA',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

@Entity()
export class Venta {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  fechaVenta: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({
    type: 'enum',
    enum: EstadoVenta,
    default: EstadoVenta.PENDIENTE
  })
  estado: EstadoVenta;

  @Column({
    type: 'enum',
    enum: TipoPago,
    default: TipoPago.EFECTIVO
  })
  tipoPago: TipoPago;

  @Column({ type: 'text', nullable: true })
  direccionEnvio?: string;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'clienteId' })
  cliente: User;

  @Column()
  clienteId: number;

  @OneToMany(() => DetalleVenta, detalle => detalle.venta, { 
    cascade: true,
    eager: true 
  })
  detalles: DetalleVenta[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
