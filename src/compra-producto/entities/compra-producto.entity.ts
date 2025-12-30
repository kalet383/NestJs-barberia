import { DetalleCompra } from "src/detalle-compra/entities/detalle-compra.entity";
import { Proveedor } from "src/proveedor/entities/proveedor.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class CompraProducto {
    @PrimaryGeneratedColumn()
    id_compra: number;

    @Column()
    fecha_compra: Date;

    @ManyToOne(() => Proveedor, proveedor => proveedor.compras, { eager: true })
    @JoinColumn({ name: "id_proveedor" })
    proveedor: Proveedor;

    @OneToMany(() => DetalleCompra, detalle => detalle.compra, { cascade: true })
    detalles: DetalleCompra[];

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    total: number;

    @Column({ default: true })
    activo: boolean;
}