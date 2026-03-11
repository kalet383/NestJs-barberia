import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ServicioService } from './servicio.service';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';

const mediaStorage = diskStorage({
  destination: join(process.cwd(), 'public/imagenes/servicios'),
  filename: (req, file, cb) => {
    const randomName = Array(32)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');
    cb(null, `${randomName}${extname(file.originalname)}`);
  },
});

// Validar tipos de archivo de video e imagen
const mediaFileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('video/') && !file.mimetype.startsWith('image/')) {
    return cb(new BadRequestException('Solo se permiten archivos de video o imagen'), false);
  }
  cb(null, true);
};

@Controller('servicio')
export class ServicioController {
  constructor(private readonly servicioService: ServicioService) {}

  @Post()
  create(@Body() createServicioDto: CreateServicioDto) {
    return this.servicioService.create(createServicioDto);
  }

  @Get()
  findAll() {
    return this.servicioService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.servicioService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateServicioDto: UpdateServicioDto) {
    return this.servicioService.update(+id, updateServicioDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.servicioService.remove(+id);
  }

  @Post('upload-media')
  @UseInterceptors(FileInterceptor('file', { storage: mediaStorage, fileFilter: mediaFileFilter }))
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó archivo');
    }
    
    const mediaUrl = `/imagenes/servicios/${file.filename}`;
    
    return {
      success: true,
      url: mediaUrl,
      message: 'Archivo subido exitosamente',
    };
  }
}
