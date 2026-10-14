import { z } from 'zod';

import { PLAN_KEYS } from './plan-keys.js';

export const planKeySchema = z.enum(PLAN_KEYS);
