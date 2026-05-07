import { Server, ServerCredentials } from '@grpc/grpc-js';
import { BIND_ADDRESS } from './lib/env';
import { addReflectionToServer } from './lib/proto';
import { schedulingService, schedulingImpl } from './services/scheduling';

const server = new Server();

server.addService(schedulingService, schedulingImpl);
addReflectionToServer(server);

server.bindAsync(BIND_ADDRESS, ServerCredentials.createInsecure(), (err) => {
	if (err) {
		console.error('Failed to bind server:', err);
		process.exit(1);
	}
	console.log(`Scheduling gRPC server running at ${BIND_ADDRESS}`);
});

process.on('SIGINT', () => {
	console.log('\nShutting down gRPC server...');
	server.tryShutdown((err) => {
		if (err) {
			console.error('Error during shutdown:', err);
			process.exit(1);
		}
		console.log('Server shut down gracefully.');
		process.exit(0);
	});
});
