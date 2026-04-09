import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export type JwtValidatedUser = {
  userId: string;
  email: string;
};

/** Validates Bearer access tokens and attaches `user` on the request for guards and decorators. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'development-only-set-JWT_SECRET',
    });
  }

  /** Maps JWT `sub` + `email` into the object read by the CurrentUser decorator. */
  validate(payload: { sub: string; email: string }): JwtValidatedUser {
    return { userId: payload.sub, email: payload.email };
  }
}
