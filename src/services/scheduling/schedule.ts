import { type handleUnaryCall } from '@grpc/grpc-js';
import { ScheduleRequest } from '~proto/proto/scheduling/scheduling';
import { Response } from '~proto/proto/common/common';
import { logger } from '../../lib/logger';

export const schedule: handleUnaryCall<ScheduleRequest, Response> = (
	call,
	callback,
) => {
	logger.info({ request: call.request }, 'Schedule called');
	const response = Response.create({
		success: true,
		message: `Appointment scheduled for ${call.request.userName} at clinic ${call.request.clinicId}`,
	});
	callback(null, response);
};
