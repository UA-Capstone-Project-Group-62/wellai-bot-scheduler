import { type handleUnaryCall } from '@grpc/grpc-js';
import { CancelRequest } from '~proto/proto/scheduling/scheduling';
import { Response } from '~proto/proto/common/common';
import { logger } from '../../lib/logger';

export const cancel: handleUnaryCall<CancelRequest, Response> = (
	call,
	callback,
) => {
	logger.info({ userId: call.request.userId }, 'Cancel called for user');
	const response = Response.create({
		success: true,
		message: `Appointment cancelled for user ${call.request.userId}`,
	});
	callback(null, response);
};
