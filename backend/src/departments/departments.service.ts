import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.department.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(name: string) {
    const existing = await this.prisma.department.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      throw new BadRequestException('Ya existe una dependencia con ese nombre');
    }

    return this.prisma.department.create({
      data: { name: name.trim() },
    });
  }

  async remove(id: number) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: { people: true },
    });

    if (!department) {
      throw new NotFoundException('Dependencia no encontrada');
    }

    if (department.people.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar una dependencia que tiene personas asociadas',
      );
    }

    return this.prisma.department.delete({ where: { id } });
  }
}