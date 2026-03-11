import { CategoriaServicio } from "src/categoria-servicio/entities/categoria-servicio.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Servicio {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100 })
    nombre: string;

    @Column('text')
    descripcion: string;

    @Column('decimal', { precision: 10, scale: 2 })
    precio: number;

    @Column({ type: 'time' })
    duracionAprox: string;

    // ✅ PRIMERO la columna (y hacerla nullable por si acaso)
    @Column({ nullable: true })
    categoriaId: number;

    @Column({ default: false })
    publicado: boolean;

    @Column({ default: false })
    destacado: boolean;

    @Column({ type: 'longtext', nullable: true })
    imagenUrl: string | null;

    @Column({ type: 'longtext', nullable: true })
    videoUrl: string | null;

    // ✅ DESPUÉS la relación
    @ManyToOne(() => CategoriaServicio, (categoria: CategoriaServicio) => categoria.servicios, { 
        eager: true,
        nullable: true  // Permite null
    })
    @JoinColumn({ name: 'categoriaId' })
    categoria: CategoriaServicio;
}
