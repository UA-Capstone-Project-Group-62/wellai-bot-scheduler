import { type handleUnaryCall } from '@grpc/grpc-js';
import { CancelRequest } from '../../../proto/gen/ts/proto/scheduling/scheduling';
import { Response } from '../../../proto/gen/ts/proto/common/common';

export const cancel: handleUnaryCall<CancelRequest, Response> = (
	call,
	callback,
) => {
	console.log('Cancel called for user:', call.request.userId);
	const response = Response.create({
		success: true,
		message: `Appointment cancelled for user ${call.request.userId}`,
	});
	callback(null, response);
};
