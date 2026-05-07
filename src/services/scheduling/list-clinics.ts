import { type handleUnaryCall } from '@grpc/grpc-js';
import { Empty } from '../../../proto/gen/ts/google/protobuf/empty';
import {
	Clinic,
	ListClinicsResponse,
} from '../../../proto/gen/ts/proto/scheduling/scheduling';

export const listClinics: handleUnaryCall<Empty, ListClinicsResponse> = (
	_call,
	callback,
) => {
	const response = ListClinicsResponse.create({
		clinics: [
			Clinic.create({
				clinicId: 'clinic-1',
				clinicName: 'Downtown Clinic',
			}),
			Clinic.create({
				clinicId: 'clinic-2',
				clinicName: 'Uptown Clinic',
			}),
		],
	});
	callback(null, response);
};
