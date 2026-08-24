import { HealthService } from './health.service';

// Exercises the status computation that the k8s readiness probe depends on,
// without standing up Redis or Postgres.
function build(dbUp: boolean, redisUp: boolean) {
  const svc = Object.create(HealthService.prototype);
  svc.logger = { error: () => {}, warn: () => {} };
  svc.prisma = {
    $queryRaw: dbUp
      ? async () => [1]
      : async () => {
          throw new Error('ECONNREFUSED');
        },
  };
  svc.redisClient = {
    ping: async () =>
      redisUp
        ? 'PONG'
        : (() => {
            throw new Error('down');
          })(),
  };
  svc.notificationsQueue = {
    getJobCounts: async () => ({ waiting: 0, active: 0 }),
  };
  svc.configService = { get: () => undefined };
  return svc as HealthService;
}

describe('HealthService status', () => {
  it('is "up" when database and redis are both reachable', async () => {
    const r: any = await build(true, true).checkHealth();
    expect(r.status).toBe('up');
  });

  it('is "degraded" (still serving) when only redis is down', async () => {
    const r: any = await build(true, false).checkHealth();
    expect(r.status).toBe('degraded');
    expect(r.services.database.status).toBe('up');
  });

  it('is "down" when the database is unreachable', async () => {
    const r: any = await build(false, true).checkHealth();
    expect(r.status).toBe('down');
  });
});
