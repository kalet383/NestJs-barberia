import { CategoriaProducto } from "src/categoria-producto/entities/categoria-producto.entity";
import { DetalleCompra } from "src/detalle-compra/entities/detalle-compra.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Producto {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100 })
    nombre: string;

    @Column('text')
    descripcion: string;

    @Column('decimal', { precision: 10, scale: 2 })
    precio_venta: number;

    @Column('int', { default: 0 })
    stock: number;

    @Column({ type: 'longtext', nullable: true })
    imagenUrl: string;

    @Column({ default: false })
    publicado: boolean;

    @Column({ default: false })
    en_oferta: boolean;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    precio_oferta: number;

    @Column('text', { nullable: true })
    dias_oferta: string;

    @Column('text', { nullable: true })
    informacion_oferta: string;

    // Cantidad disponible en la tienda para este producto (publicada por Admin/SuperAdmin)
    @Column('int', { default: 0 })
    cantidad_publicada: number;

    @ManyToOne(() => CategoriaProducto, (categoria: CategoriaProducto) => categoria.productos, { eager: true })
    @JoinColumn({ name: 'categoriaId' })
    categoria: CategoriaProducto;

    @OneToMany(() => DetalleCompra, detalle => detalle.producto)
    detallesCompra: DetalleCompra[];

    @Column()
    categoriaId: number;
} 