import { Server, ServerCredentials } from '@grpc/grpc-js';
import { BIND_ADDRESS } from './lib/env';
import { addReflectionToServer } from './lib/proto';
import { logger } from './lib/logger';
import { schedulingService, schedulingImpl } from './services/scheduling';
import { startReminderJob, stopReminderJob } from './services/jobs/reminders';
import { closeDbPool } from './lib/db';
import { initCalendarClient } from './services/calendar/calendar';
import { initBotClient } from './services/bot/bot';

initCalendarClient();
initBotClient();

const server = new Server();

server.addService(schedulingService, schedulingImpl);
addReflectionToServer(server);

server.bindAsync(BIND_ADDRESS, ServerCredentials.createInsecure(), (err) => {
	if (err) {
		logger.error(err, 'Failed to bind server');
		process.exit(1);
	}
	logger.info(`Scheduling gRPC server running at ${BIND_ADDRESS}`);
});

startReminderJob();

let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
	if (isShuttingDown) return;
	isShuttingDown = true;

	logger.info({ signal }, 'Received shutdown signal');

	logger.info('Stopping reminder job...');
	stopReminderJob();

	logger.info('Closing database pool...');
	await closeDbPool();

	server.tryShutdown((err) => {
		if (err) {
			logger.error(err, 'Error during gRPC shutdown');
			process.exit(1);
		}
		logger.info('Server shut down gracefully');
		process.exit(0);
	});
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));