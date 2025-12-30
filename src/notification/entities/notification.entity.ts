import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  ManyToOne, 
  JoinColumn,
  CreateDateColumn 
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum TipoNotificacion {
  NUEVA_VENTA = 'NUEVA_VENTA',
  CAMBIO_ESTADO_VENTA = 'CAMBIO_ESTADO_VENTA',
  VENTA_CANCELADA = 'VENTA_CANCELADA',
}

@Entity('notification')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: TipoNotificacion })
  tipo: TipoNotificacion;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ default: false })
  leida: boolean;

  @ManyToOne(() => User, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;

  @Column()
  usuarioId: number;

  @Column({ nullable: true })
  ventaId?: number;

  @CreateDateColumn()
  createdAt: Date;
}
