import { Exclude } from 'class-transformer';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export enum Role {
  SUPERADMIN = 'superadmin',
  ADMINISTRADOR = 'administrador',
  BARBERO = 'barbero',
  CLIENTE = 'cliente',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 100 })
  apellido: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ type: 'varchar', length: 15})
  telefono: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  foto?: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.CLIENTE
  })
  role:Role;

  @Column({ default: true })
  activo?: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}