import { AsyncLocalStorage } from 'node:async_hooks';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

type RequestContext = {
  userId?: number;
};

const storage = new AsyncLocalStorage<RequestContext>();

// Usuario autenticado del request en curso (lo carga JwtStrategy en req.user).
export function getCurrentUserId(): number | undefined {
  return storage.getStore()?.userId;
}

// Corre después de los guards, así que req.user ya está disponible.
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const store: RequestContext = { userId: request.user?.userId };

    return new Observable((subscriber) =>
      storage.run(store, () => next.handle().subscribe(subscriber)),
    );
  }
}
