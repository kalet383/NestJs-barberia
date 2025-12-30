import { CompraProducto } from "src/compra-producto/entities/compra-producto.entity";
import { Producto } from "src/producto/entities/producto.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class DetalleCompra {
    @PrimaryGeneratedColumn()
    id_detalle: number;

    @ManyToOne(() => CompraProducto, compra => compra.detalles, { eager: true })
    @JoinColumn({ name: "id_compra" })
    compra: CompraProducto;

    @ManyToOne(() => Producto, producto => producto.detallesCompra, { eager: true })
    @JoinColumn({ name: "id_producto" })
    producto: Producto;

    @Column('int')
    cantidad: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    precio_compra: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    subtotal: number;
}