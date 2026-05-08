export const env = {
	DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://wellai:wellai123@localhost:5432/wellai_scheduler',
	RABBITMQ_URL: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
	GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS ?? './config/service-account-key.json',
	GRPC_PORT: process.env.GRPC_PORT ?? '50051',
	LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
	NODE_ENV: process.env.NODE_ENV ?? 'development',
	BOT_SERVICE_ADDRESS: process.env.BOT_SERVICE_ADDRESS ?? 'localhost:50052',
};

export const BIND_ADDRESS = `0.0.0.0:${env.GRPC_PORT}`;