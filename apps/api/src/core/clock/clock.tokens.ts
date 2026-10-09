export const CLOCK = Symbol('CLOCK');

export type Clock = {
  now(): Date;
};
