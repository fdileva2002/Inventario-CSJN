import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { getCurrentUserId } from '../common/request-context';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReturnAssignmentDto } from './dto/return-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAssignmentDto: CreateAssignmentDto) {
    const { deviceId, personId, departmentId, notes } = createAssignmentDto;
    
    if (!personId && !departmentId) {
      throw new BadRequestException(
        'Debe indicar una persona o una dependencia para asignar el dispositivo',
      );
    }
  
    if (personId && departmentId) {
      throw new BadRequestException(
        'No se puede asignar a una persona y una dependencia al mismo tiempo',
      );
    }
  
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: { status: true },
    });
  
    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado');
    }
  
    let assigneeName = '';

    if (personId) {
      const person = await this.prisma.person.findUnique({
        where: { id: personId },
      });
      if (!person) {
        throw new NotFoundException('Persona no encontrada');
      }
      assigneeName = person.fullName;
    }

    if (departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!department) {
        throw new NotFoundException('Dependencia no encontrada');
      }
      assigneeName = department.name;
    }

    const availableStatus = await this.prisma.deviceStatus.findUnique({
      where: { code: 'DISPONIBLE' },
    });

    if (!availableStatus) {
      throw new NotFoundException('No existe el estado DISPONIBLE');
    }

    const inUseStatus = await this.prisma.deviceStatus.findUnique({
      where: { code: 'EN_FUNCIONAMIENTO' },
    });

    if (!inUseStatus) {
      throw new NotFoundException('No existe el estado EN_FUNCIONAMIENTO');
    }

    const newLocation = createAssignmentDto.location?.trim() || undefined;

    const assignment = await this.prisma.transaction(async (tx) => {
      // Pasar a EN_FUNCIONAMIENTO solo si sigue DISPONIBLE: si otra asignación
      // llegó primero, este update no afecta filas y se corta acá.
      const transition = await tx.device.updateMany({
        where: { id: deviceId, statusId: availableStatus.id },
        data: {
          statusId: inUseStatus.id,
          ...(newLocation ? { location: newLocation } : {}),
        },
      });

      if (transition.count !== 1) {
        throw new BadRequestException(
          'Solo se pueden asignar dispositivos en estado DISPONIBLE',
        );
      }

      const activeAssignment = await tx.deviceAssignment.findFirst({
        where: { deviceId, returnedAt: null },
      });

      if (activeAssignment) {
        throw new BadRequestException(
          'El dispositivo ya está asignado y no fue devuelto',
        );
      }

      const created = await tx.deviceAssignment.create({
        data: {
          deviceId,
          personId: personId ?? null,
          departmentId: departmentId ?? null,
          assignedAt: new Date(),
          status: 'ACTIVA',
          notes,
          createdById: getCurrentUserId(),
        },
      });

      await tx.deviceMovement.create({
        data: {
          deviceId,
          type: 'ASIGNACION',
          previousStatus: device.status.code,
          newStatus: inUseStatus.code,
          personId: personId ?? null,
          departmentId: departmentId ?? null,
          previousLocation: newLocation ? device.location : undefined,
          newLocation,
          detail: notes?.trim() || `Asignación a ${assigneeName}`,
        },
      });

      return created;
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
        department: true,
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
        department: true,
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
        department: true,
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

    await this.prisma.transaction(async (tx) => {
      // Cierra la asignación solo si sigue abierta (evita doble devolución).
      const closed = await tx.deviceAssignment.updateMany({
        where: { id, returnedAt: null },
        data: {
          returnedAt: new Date(),
          status: 'FINALIZADA',
          notes: returnAssignmentDto.notes ?? assignment.notes,
        },
      });

      if (closed.count !== 1) {
        throw new BadRequestException('La asignación ya fue cerrada');
      }

      await tx.device.update({
        where: { id: assignment.deviceId },
        data: {
          statusId: toConfigureStatus.id,
        },
      });

      await tx.deviceMovement.create({
        data: {
          deviceId: assignment.deviceId,
          type: 'DEVOLUCION',
          previousStatus: assignment.device.status.code,
          newStatus: toConfigureStatus.code,
          personId: assignment.personId,
          departmentId: assignment.departmentId,
          detail: returnAssignmentDto.notes?.trim() || 'Devolución de dispositivo',
        },
      });
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
        department: true,
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
        department: true,
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
        department: true,
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });
  }
}