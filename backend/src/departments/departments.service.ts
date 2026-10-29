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

    if (existing?.active) {
      throw new BadRequestException('Ya existe una dependencia con ese nombre');
    }

    // Una dependencia dada de baja con el mismo nombre se reactiva, así conserva su historial.
    if (existing) {
      return this.prisma.transaction((tx) => tx.department.update({
        where: { id: existing.id },
        data: { active: true },
      }));
    }

    return this.prisma.transaction((tx) => tx.department.create({
      data: { name: name.trim() },
    }));
  }

  async remove(id: number) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            people: { where: { active: true } },
            assignments: true,
            deviceMovements: true,
            consumableAssignments: true,
          },
        },
      },
    });

    if (!department || !department.active) {
      throw new NotFoundException('Dependencia no encontrada');
    }

    if (department._count.people > 0) {
      throw new BadRequestException(
        'No se puede eliminar una dependencia que tiene personas asociadas',
      );
    }

    const { assignments, deviceMovements, consumableAssignments } = department._count;
    const hasHistory = assignments + deviceMovements + consumableAssignments > 0;

    // Con historial se da de baja lógica: borrarla dejaría movimientos sin dependencia.
    if (hasHistory) {
      return this.prisma.transaction((tx) => tx.department.update({
        where: { id },
        data: { active: false },
      }));
    }

    return this.prisma.transaction((tx) => tx.department.delete({ where: { id } }));
  }
}
