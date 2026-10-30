import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { EnvConfig } from '../../../config/env.ts';

export interface HealthRouteOptions {
  config: EnvConfig;
}

export const healthRoutes: FastifyPluginAsync<HealthRouteOptions> = async (
  fastify: FastifyInstance,
  opts: HealthRouteOptions
) => {
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: opts.config.NODE_ENV,
    };
  });
};
