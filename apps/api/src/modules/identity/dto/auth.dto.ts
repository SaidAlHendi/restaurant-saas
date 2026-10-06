import { createZodDto } from 'nestjs-zod';
import {
  loginBodySchema,
  signupBodySchema,
  switchOrgBodySchema,
} from '@app/shared';

export class SignupBodyDto extends createZodDto(signupBodySchema) {}
export class LoginBodyDto extends createZodDto(loginBodySchema) {}
export class SwitchOrgBodyDto extends createZodDto(switchOrgBodySchema) {}
