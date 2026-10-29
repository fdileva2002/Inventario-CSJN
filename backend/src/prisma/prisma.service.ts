import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { getCurrentUserId } from '../common/request-context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }

  /**
   * Toda escritura pasa por acá. Abre una transacción y le informa a la base
   * qué usuario está operando, para que los triggers de auditoría y de
   * movimientos lo registren (ver migración historial_confiable).
   */
  transaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { timeout?: number },
  ): Promise<T> {
    const userId = getCurrentUserId();

    return this.$transaction(
      async (tx) => {
        if (userId !== undefined) {
          await tx.$executeRaw`SELECT set_config('app.user_id', ${String(userId)}, true)`;
        }
        return fn(tx);
      },
      { timeout: options?.timeout ?? 15000 },
    );
  }
}
