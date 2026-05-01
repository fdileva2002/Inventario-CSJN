import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email.trim().toLowerCase() },
    });

    if (existingUser) {
      throw new BadRequestException('Ya existe un usuario con ese email');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name.trim(),
        email: createUserDto.email.trim().toLowerCase(),
        passwordHash,
        role: createUserDto.role,
        active: true,
      },
    });

    return this.sanitizeUser(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });

    return users.map((user) => this.sanitizeUser(user));
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`No se encontró el usuario con id ${id}`);
    }

    return this.sanitizeUser(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findExistingUser(id);

    if (updateUserDto.email) {
      const existingUserWithEmail = await this.prisma.user.findFirst({
        where: {
          email: updateUserDto.email.trim().toLowerCase(),
          NOT: { id },
        },
      });

      if (existingUserWithEmail) {
        throw new BadRequestException('Ya existe un usuario con ese email');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        name:
          updateUserDto.name !== undefined
            ? updateUserDto.name.trim()
            : undefined,
        email:
          updateUserDto.email !== undefined
            ? updateUserDto.email.trim().toLowerCase()
            : undefined,
        role: updateUserDto.role,
        active: updateUserDto.active,
      },
    });

    return this.sanitizeUser(updatedUser);
  }

  async updatePassword(id: number, updateUserPasswordDto: UpdateUserPasswordDto) {
    await this.findExistingUser(id);

    const passwordHash = await bcrypt.hash(updateUserPasswordDto.password, 10);

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return {
      message: 'Contraseña actualizada correctamente',
      user: this.sanitizeUser(updatedUser),
    };
  }

  private async findExistingUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`No se encontró el usuario con id ${id}`);
    }

    return user;
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}