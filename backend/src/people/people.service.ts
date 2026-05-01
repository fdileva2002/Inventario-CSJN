import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { FindPeopleDto } from './dto/find-people.dto';

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPersonDto: CreatePersonDto) {
    return this.prisma.person.create({
      data: createPersonDto,
    });
  }

  async findAll(filters: FindPeopleDto) {
    const where: any = {};
    
    if (filters.search && filters.search.trim() !== '') {
      where.OR = [
        {
          fullName: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          employeeId: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      ];
    }
  
    if (filters.department && filters.department.trim() !== '') {
      where.department = {
        contains: filters.department,
        mode: 'insensitive',
      };
    }
  
    return this.prisma.person.findMany({
      where,
      orderBy: {
        fullName: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const person = await this.prisma.person.findUnique({
      where: { id },
    });

    if (!person) {
      throw new NotFoundException(`No se encontró la persona con id ${id}`);
    }

    return person;
  }

  async update(id: number, updatePersonDto: UpdatePersonDto) {
    await this.findOne(id);

    return this.prisma.person.update({
      where: { id },
      data: updatePersonDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.person.delete({
      where: { id },
    });
  }
}