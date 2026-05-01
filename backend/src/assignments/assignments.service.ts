import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReturnAssignmentDto } from './dto/return-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAssignmentDto: CreateAssignmentDto) {
    const { deviceId, personId, notes } = createAssignmentDto;

    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        status: true,
      },
    });

    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado');
    }

    const person = await this.prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person) {
      throw new NotFoundException('Persona no encontrada');
    }

    const availableStatus = await this.prisma.deviceStatus.findUnique({
      where: { code: 'DISPONIBLE' },
    });

    if (!availableStatus) {
      throw new NotFoundException(
        'No existe el estado DISPONIBLE en la base de datos',
      );
    }

    if (device.statusId !== availableStatus.id) {
      throw new BadRequestException(
        'Solo se pueden asignar dispositivos en estado DISPONIBLE',
      );
    }

    const activeAssignment = await this.prisma.deviceAssignment.findFirst({
      where: {
        deviceId,
        returnedAt: null,
      },
    });

    if (activeAssignment) {
      throw new BadRequestException(
        'El dispositivo ya está asignado y no fue devuelto',
      );
    }

    const inUseStatus = await this.prisma.deviceStatus.findUnique({
      where: { code: 'EN_FUNCIONAMIENTO' },
    });

    if (!inUseStatus) {
      throw new NotFoundException(
        'No existe el estado EN_FUNCIONAMIENTO en la base de datos',
      );
    }

    const assignment = await this.prisma.deviceAssignment.create({
  data: {
    deviceId,
    personId,
    assignedAt: new Date(),
    status: 'ACTIVA',
    notes,
  },
  include: {
    device: true,
    person: true,
  },
});

    await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        statusId: inUseStatus.id,
      },
    });

    await this.prisma.deviceMovement.create({
      data: {
        deviceId,
        type: 'ASIGNACION',
        previousStatus: device.status.code,
        newStatus: inUseStatus.code,
        personId,
        detail: notes ?? 'Asignación de dispositivo',
      },
    });

    return this.prisma.deviceAssignment.findUnique({
      where: { id: assignment.id },
      include: {
        device: {
          include: {
            category: true,
            model: true,
            status: true,
            supplier: true,
            purchaseOrder: true,
          },
        },
        person: true,
      },
    });
  }

  async findAll() {
    return this.prisma.deviceAssignment.findMany({
      include: {
        device: {
          include: {
            category: true,
            model: true,
            status: true,
            supplier: true,
            purchaseOrder: true,
          },
        },
        person: true,
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });
  }

  async findActive() {
    return this.prisma.deviceAssignment.findMany({
      where: {
        returnedAt: null,
      },
      include: {
        device: {
          include: {
            category: true,
            model: true,
            status: true,
            supplier: true,
            purchaseOrder: true,
          },
        },
        person: true,
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });
  }

  async returnDevice(id: number, returnAssignmentDto: ReturnAssignmentDto) {
    const assignment = await this.prisma.deviceAssignment.findUnique({
      where: { id },
      include: {
        device: {
          include: {
            status: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    if (assignment.returnedAt) {
      throw new BadRequestException('La asignación ya fue cerrada');
    }

    const toConfigureStatus = await this.prisma.deviceStatus.findUnique({
      where: { code: 'A_CONFIGURAR' },
    });

    if (!toConfigureStatus) {
      throw new NotFoundException(
        'No existe el estado A_CONFIGURAR en la base de datos',
      );
    }

    await this.prisma.deviceAssignment.update({
      where: { id },
      data: {
        returnedAt: new Date(),
        status: 'FINALIZADA',
        notes: returnAssignmentDto.notes ?? assignment.notes,
      },
    });

    await this.prisma.device.update({
      where: { id: assignment.deviceId },
      data: {
        statusId: toConfigureStatus.id,
      },
    });

    await this.prisma.deviceMovement.create({
      data: {
        deviceId: assignment.deviceId,
        type: 'DEVOLUCION',
        previousStatus: assignment.device.status.code,
        newStatus: toConfigureStatus.code,
        personId: assignment.personId,
        detail: returnAssignmentDto.notes ?? 'Devolución de dispositivo',
      },
    });

    return this.prisma.deviceAssignment.findUnique({
      where: { id },
      include: {
        device: {
          include: {
            category: true,
            model: true,
            status: true,
            supplier: true,
            purchaseOrder: true,
          },
        },
        person: true,
      },
    });
  }

  async findHistoryByDevice(deviceId: number) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado');
    }

    return this.prisma.deviceAssignment.findMany({
      where: { deviceId },
      include: {
        device: {
          include: {
            category: true,
            model: true,
            status: true,
            supplier: true,
            purchaseOrder: true,
          },
        },
        person: true,
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });
  }

  async findHistoryByPerson(personId: number) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person) {
      throw new NotFoundException('Persona no encontrada');
    }

    return this.prisma.deviceAssignment.findMany({
      where: { personId },
      include: {
        device: {
          include: {
            category: true,
            model: true,
            status: true,
            supplier: true,
            purchaseOrder: true,
          },
        },
        person: true,
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });
  }
}