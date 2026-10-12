import { OutboxPublisherJob } from './outbox-publisher.job';

describe('OutboxPublisherJob', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not overlap ticks when publish is slower than the interval', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const publisher = {
      publishNextBatch: jest.fn(async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            inFlight -= 1;
            resolve();
          }, 100);
        });
        return 0;
      }),
    };

    const job = new OutboxPublisherJob(
      { OUTBOX_PUBLISHER_INTERVAL_MS: 50, OUTBOX_SHUTDOWN_TIMEOUT_MS: 10_000 } as never,
      publisher as never,
    );
    job.onModuleInit();

    await jest.advanceTimersByTimeAsync(50);
    await jest.advanceTimersByTimeAsync(50);
    await jest.advanceTimersByTimeAsync(100);

    expect(maxInFlight).toBe(1);
    expect(publisher.publishNextBatch.mock.calls.length).toBeGreaterThanOrEqual(1);

    const destroyPromise = job.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(200);
    await destroyPromise;
  });

  it('awaits a fast in-flight tick on destroy and leaves no pending timers', async () => {
    const publisher = {
      publishNextBatch: jest.fn(
        () =>
          new Promise<void>((resolve) => {
            setTimeout(() => {
              resolve();
            }, 200);
          }),
      ),
    };

    const job = new OutboxPublisherJob(
      { OUTBOX_PUBLISHER_INTERVAL_MS: 50_000, OUTBOX_SHUTDOWN_TIMEOUT_MS: 10_000 } as never,
      publisher as never,
    );
    job.onModuleInit();
    await jest.advanceTimersByTimeAsync(0);

    const destroyPromise = job.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(200);
    await destroyPromise;

    expect(publisher.publishNextBatch).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('stops waiting for destroy when shutdown cap is reached', async () => {
    const publisher = {
      publishNextBatch: jest.fn(() => new Promise<void>(() => undefined)),
    };

    const job = new OutboxPublisherJob(
      { OUTBOX_PUBLISHER_INTERVAL_MS: 50_000, OUTBOX_SHUTDOWN_TIMEOUT_MS: 100 } as never,
      publisher as never,
    );
    job.onModuleInit();
    await jest.advanceTimersByTimeAsync(0);

    const destroyPromise = job.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(100);
    await destroyPromise;

    expect(publisher.publishNextBatch).toHaveBeenCalledTimes(1);
  });
});
