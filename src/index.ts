import { loadEnv } from './config/env.ts';
import { buildServer } from './infrastructure/http/server.ts';

async function bootstrap() {
  try {
    const config = loadEnv();
    const server = await buildServer(config);

    await server.listen({
      port: config.PORT,
      host: config.HOST,
    });

    console.log(`[Gateway] Servidor ativo em http://${config.HOST}:${config.PORT}`);
    console.log(`[Gateway] Ambiente: ${config.NODE_ENV} | Estratégia Padrão: ${config.DEFAULT_ROUTING_STRATEGY}`);
  } catch (error) {
    console.error('[Gateway] Falha crítica na inicialização:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

bootstrap();
