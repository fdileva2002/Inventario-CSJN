import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { getCurrentUserId } from '../common/request-context';
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

    const user = await this.prisma.transaction((tx) => tx.user.create({
      data: {
        name: createUserDto.name.trim(),
        email: createUserDto.email.trim().toLowerCase(),
        passwordHash,
        role: createUserDto.role,
        active: true,
      },
    }));

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
    const user = await this.findExistingUser(id);

    // Siempre tiene que quedar al menos un Superadmin activo que pueda administrar usuarios.
    const losesSuperadmin =
      user.role === 'SUPERADMIN' &&
      user.active &&
      ((updateUserDto.role !== undefined && updateUserDto.role !== 'SUPERADMIN') ||
        updateUserDto.active === false);

    if (losesSuperadmin) {
      const activeSuperadmins = await this.prisma.user.count({
        where: { role: 'SUPERADMIN', active: true },
      });

      if (activeSuperadmins <= 1) {
        throw new BadRequestException(
          'No se puede quitar el rol ni desactivar al último Superadmin activo',
        );
      }
    }

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

    const updatedUser = await this.prisma.transaction((tx) => tx.user.update({
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
    }));

    return this.sanitizeUser(updatedUser);
  }

  // Solo la propia. Para otros usuarios está resetPassword (Superadmin).
  async updatePassword(id: number, updateUserPasswordDto: UpdateUserPasswordDto) {
    if (id !== getCurrentUserId()) {
      throw new ForbiddenException('Solo podés cambiar tu propia contraseña');
    }

    const user = await this.findExistingUser(id);

    const passwordOk = await bcrypt.compare(
      updateUserPasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!passwordOk) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    const passwordHash = await bcrypt.hash(updateUserPasswordDto.password, 10);

    const updatedUser = await this.prisma.transaction((tx) => tx.user.update({
      where: { id },
      data: { passwordHash },
    }));

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

    return user; // Prisma infiere el tipo completo incluido passwordHash
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async resetPassword(id: number) {
    await this.findExistingUser(id);

    // Temporal aleatoria por reseteo (antes era una fija igual para todos).
    // Sin caracteres ambiguos (0/O, 1/l/I) para dictarla sin errores.
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const temporaryPassword = Array.from(
      { length: 10 },
      () => alphabet[randomInt(alphabet.length)],
    ).join('');
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    await this.prisma.transaction((tx) => tx.user.update({
      where: { id },
      data: { passwordHash },
    }));

    return {
      message: `Contraseña reseteada. Nueva contraseña temporal: ${temporaryPassword}`,
      temporaryPassword,
    };
  }
}