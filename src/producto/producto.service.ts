import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Producto } from './entities/producto.entity';

@Injectable()
export class ProductoService {
  constructor(
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
  ) {}

  async create(createProductoDto: CreateProductoDto) {
    // El stock inicial siempre es 0 y publicado por defecto false si no se indica
    const producto = this.productoRepository.create({
      ...createProductoDto,
      stock: 0,
      publicado: createProductoDto.publicado ?? false,
    } as any);
    return await this.productoRepository.save(producto);
  }

  async findAll() {
    return await this.productoRepository.find({
      relations: ['categoria']
    });
  }

  async findOne(id: number) {
    const producto = await this.productoRepository.findOne({
      where: { id },
      relations: ['categoria']
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    return producto;
  }

  async findPublishedWithStock() {
    // Productos publicados y con cantidad publicada mayor a 0
    return await this.productoRepository.find({
      where: { publicado: true, cantidad_publicada: MoreThan(0) },
      relations: ['categoria']
    });
  }

  async publishProduct(id: number, cantidad: number) {
    const producto = await this.findOne(id);
    // Validar que la suma de lo ya publicado y lo nuevo no supere el stock
    const disponibleParaPublicar = (producto.stock || 0) - (producto.cantidad_publicada || 0);
    if (cantidad > disponibleParaPublicar) {
      // devolver available en el body para que el frontend lo muestre si lo desea
      const err: any = new BadRequestException(`No se puede publicar más de la cantidad disponible para publicar: ${disponibleParaPublicar}`);
      (err as any).response = { available: disponibleParaPublicar };
      throw err;
    }

    // Incrementar la cantidad publicada (no reemplazar)
    producto.cantidad_publicada = (producto.cantidad_publicada || 0) + cantidad;
    producto.publicado = producto.cantidad_publicada > 0;

    return await this.productoRepository.save(producto);
  }

  async unpublishProduct(id: number) {
    const producto = await this.findOne(id);
    producto.cantidad_publicada = 0;
    producto.publicado = false;

    return await this.productoRepository.save(producto);
  }

  async update(id: number, updateProductoDto: UpdateProductoDto) {
    await this.productoRepository.update(id, updateProductoDto);
    // después de actualizar, asegurarnos de que cantidad_publicada no supere el stock
    const producto = await this.findOne(id);
    if (producto.cantidad_publicada > producto.stock) {
      producto.cantidad_publicada = producto.stock;
      producto.publicado = producto.cantidad_publicada > 0;
      await this.productoRepository.save(producto);
    }
    return producto;
  }

  async remove(id: number) {
    const producto = await this.findOne(id);
    await this.productoRepository.remove(producto);
    return `Producto con id ${id} eliminado correctamente`;
  }
}