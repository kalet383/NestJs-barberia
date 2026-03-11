import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Servicio } from "./entities/servicio.entity";
import { CreateServicioDto } from './dto/create-servicio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';

@Injectable()
export class ServicioService {
  constructor(
    @InjectRepository(Servicio)
    private readonly servicioRepository: Repository<Servicio>,
  ) {}

  async create(createServicioDto: CreateServicioDto): Promise<Servicio> {
    const nuevoServicio = this.servicioRepository.create({
      ...createServicioDto,
      publicado: createServicioDto.publicado ?? false,
    });
    return await this.servicioRepository.save(nuevoServicio);
  }

  async findAll(): Promise<Servicio[]> {
    return await this.servicioRepository.find({
      relations: ['categoria']
    })
  }

  async findOne(id: number) {
    const servicio = await this.servicioRepository.findOne({
      where : { id },
      relations: ['categoria']
    })

    if (!servicio) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }
    return servicio
  }

  async update(id: number, updateServicioDto: UpdateServicioDto): Promise<Servicio> {
    const servicio = await this.findOne(id);
    Object.assign(servicio, updateServicioDto);
    return await this.servicioRepository.save(servicio);
  }

  async remove(id: number) {
    const servicio = await this.findOne(id);
    await this.servicioRepository.remove(servicio)
    return `Servicio con id ${id} eliminado correctamente`;
  }

  async updateVideoUrl(id: number, videoUrl: string): Promise<Servicio> {
    const servicio = await this.findOne(id);
    servicio.videoUrl = videoUrl;
    return await this.servicioRepository.save(servicio);
  }
}
