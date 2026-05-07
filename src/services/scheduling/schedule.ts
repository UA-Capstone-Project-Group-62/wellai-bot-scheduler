import { type handleUnaryCall } from '@grpc/grpc-js';
import { ScheduleRequest } from '../../../proto/gen/ts/proto/scheduling/scheduling';
import { Response } from '../../../proto/gen/ts/proto/common/common';

export const schedule: handleUnaryCall<ScheduleRequest, Response> = (
	call,
	callback,
) => {
	console.log('Schedule called:', call.request);
	const response = Response.create({
		success: true,
		message: `Appointment scheduled for ${call.request.userName} at clinic ${call.request.clinicId}`,
	});
	callback(null, response);
};
