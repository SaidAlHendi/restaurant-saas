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
      { OUTBOX_PUBLISHER_INTERVAL_MS: 50 } as never,
      publisher as never,
    );
    job.onModuleInit();

    await jest.advanceTimersByTimeAsync(50);
    await jest.advanceTimersByTimeAsync(50);
    await jest.advanceTimersByTimeAsync(100);

    job.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(200);

    expect(maxInFlight).toBe(1);
    expect(publisher.publishNextBatch.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
