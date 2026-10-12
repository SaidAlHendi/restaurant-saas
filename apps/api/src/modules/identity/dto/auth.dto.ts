import { createZodDto } from 'nestjs-zod';
import {
  acceptInviteBodySchema,
  loginBodySchema,
  signupBodySchema,
  switchOrgBodySchema,
} from '@app/shared';

export class SignupBodyDto extends createZodDto(signupBodySchema) {}
export class LoginBodyDto extends createZodDto(loginBodySchema) {}
export class SwitchOrgBodyDto extends createZodDto(switchOrgBodySchema) {}
export class AcceptInviteBodyDto extends createZodDto(acceptInviteBodySchema) {}
