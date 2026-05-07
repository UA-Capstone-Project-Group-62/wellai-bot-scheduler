import { Server, ServerCredentials } from '@grpc/grpc-js';
import { BIND_ADDRESS } from './lib/env';
import { addReflectionToServer } from './lib/proto';
import { logger } from './lib/logger';
import { schedulingService, schedulingImpl } from './services/scheduling';

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

process.on('SIGINT', () => {
	logger.info('Shutting down gRPC server...');
	server.tryShutdown((err) => {
		if (err) {
			logger.error(err, 'Error during shutdown');
			process.exit(1);
		}
		logger.info('Server shut down gracefully');
		process.exit(0);
	});
});
