import * as protoLoader from '@grpc/proto-loader';
import { ReflectionService } from '@grpc/reflection';
import type { Server } from '@grpc/grpc-js';

const PROTO_ROOT = './proto';
const SCHEDULING_PROTO = 'proto/scheduling/scheduling.proto';

export const packageDefinition = protoLoader.loadSync(SCHEDULING_PROTO, {
	keepCase: true,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true,
	includeDirs: [PROTO_ROOT],
});

export function addReflectionToServer(server: Server): void {
	const reflection = new ReflectionService(packageDefinition);
	reflection.addToServer(server);
}
