import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtValidatedUser } from './strategies/jwt.strategy';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtValidatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtValidatedUser }>();
    const user = request.user;
    if (!user) {
      return undefined;
    }
    return data ? user[data] : user;
  },
);
