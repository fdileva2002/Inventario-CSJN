import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { FindPeopleDto } from './dto/find-people.dto';

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPersonDto: CreatePersonDto) {
    const existing = await this.prisma.person.findFirst({
      where: { employeeId: createPersonDto.employeeId },
    });

    if (existing) {
      throw new BadRequestException('Ya existe una persona con ese CUIL');
    }

    try {
      return await this.prisma.transaction((tx) => tx.person.create({
        data: createPersonDto,
        include: { department: true },
      }));
    } catch (error) {
      this.rethrowDuplicate(error);
    }
  }

  async findAll(filters: FindPeopleDto) {
    const where: any = {};
    
    if (filters.search && filters.search.trim() !== '') {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { employeeId: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
  
    if (filters.department && filters.department.trim() !== '') {
      where.department = {
        name: { contains: filters.department, mode: 'insensitive' },
      };
    }
  
    const page = filters.page ?? 0;
    const limit = filters.limit ?? 40;
  
    const [people, total] = await Promise.all([
      this.prisma.person.findMany({
        where,
        include: { department: true },
        orderBy: { fullName: 'asc' },
        skip: page * limit,
        take: limit,
      }),
      this.prisma.person.count({ where }),
    ]);
  
    return {
      data: people,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const person = await this.prisma.person.findUnique({
      where: { id },
      include: { department: true },
    });

    if (!person) {
      throw new NotFoundException(`No se encontró la persona con id ${id}`);
    }

    return person;
  }

  async update(id: number, updatePersonDto: UpdatePersonDto) {
    await this.findOne(id);

    try {
      return await this.prisma.transaction((tx) => tx.person.update({
        where: { id },
        data: updatePersonDto,
        include: { department: true },
      }));
    } catch (error) {
      this.rethrowDuplicate(error);
    }
  }

  // El índice único también cubre la edición y dos altas simultáneas con el mismo CUIL.
  private rethrowDuplicate(error: any): never {
    if (error?.code === 'P2002') {
      throw new BadRequestException('Ya existe una persona con ese CUIL');
    }
    throw error;
  }

  async remove(id: number) {
    await this.findOne(id);

    try {
      return await this.prisma.transaction((tx) => tx.person.delete({ where: { id } }));
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'No se puede eliminar porque tiene asignaciones asociadas',
        );
      }
      throw error;
    }
  }
}