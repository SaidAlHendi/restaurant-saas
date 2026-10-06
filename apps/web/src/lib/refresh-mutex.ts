/**
 * Ensures a single in-flight refresh; concurrent 401 handlers share one promise.
 */
export class RefreshMutex {
  private inFlight: Promise<string | null> | null = null;

  run(refresh: () => Promise<string | null>): Promise<string | null> {
    if (!this.inFlight) {
      this.inFlight = refresh().finally(() => {
        this.inFlight = null;
      });
    }
    return this.inFlight;
  }

  /** @internal tests */
  isLocked(): boolean {
    return this.inFlight !== null;
  }
}

export const refreshMutex = new RefreshMutex();
