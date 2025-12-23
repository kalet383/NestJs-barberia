import { Controller, Post, Body, Request, Get, Param, Patch, Delete, Res, ParseIntPipe, Put } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SuperAdminGuard } from './guards/superadmin.guard';
import { UseGuards } from '@nestjs/common';
import { Role } from './entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('register-barber')
  async registerBarber(@Body() registerDto: RegisterDto) {
    // fuerza role barbero
    registerDto.role = Role.BARBERO;
    return this.authService.register(registerDto);
  }

  @Post('register-barber-with-schedule')
  async registerBarberWithSchedule(@Body() createBarberWithScheduleDto: any) {
    return this.authService.registerBarberWithSchedule(createBarberWithScheduleDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    const token = await this.authService.login(loginDto);

    // Guardamos el token en una cookie httpOnly
    res.cookie('jwt', token.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true en producción con https
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60, // 1 hora
    });

    // 🎯 DEVOLVER TAMBIÉN LOS DATOS DEL USUARIO
    return res.json({ 
      message: 'Login exitoso',
      user: token.user // Asegúrate de que tu authService.login devuelva también el usuario
    });
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('jwt');
    return { message: 'Logout exitoso' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user; // este viene del validate() en JwtStrategy
  }

  @Get()
  findAll() {
    return this.authService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.authService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authService.remove(+id);
  }

  // ============ ENDPOINTS SUPERADMIN ============
  
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Post('superadmin/create-admin')
  async createAdmin(@Body() registerDto: RegisterDto) {
    registerDto.role = Role.ADMINISTRADOR;
    return this.authService.register(registerDto);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Post('superadmin/create-barber')
  async createBarberBySuperAdmin(@Body() registerDto: RegisterDto) {
    registerDto.role = Role.BARBERO;
    return this.authService.register(registerDto);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Post('superadmin/create-client')
  async createClient(@Body() registerDto: RegisterDto) {
    registerDto.role = Role.CLIENTE;
    return this.authService.register(registerDto);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Put('superadmin/update-user/:id')
  async updateUser(@Param('id', ParseIntPipe) id: number, @Body() updateDto: Partial<RegisterDto>) {
    return this.authService.updateUser(id, updateDto);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Patch('superadmin/toggle-status/:id')
  async toggleUserStatus(@Param('id', ParseIntPipe) id: number) {
    return this.authService.toggleUserStatus(id);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get('superadmin/users-by-role/:role')
  async getUsersByRole(@Param('role') role: Role) {
    return this.authService.getUsersByRole(role);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get('superadmin/statistics')
  async getStatistics() {
    return this.authService.getStatistics();
  }
  
}
