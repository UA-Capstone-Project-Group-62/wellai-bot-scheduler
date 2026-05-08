import { type handleUnaryCall } from '@grpc/grpc-js';
import { Empty } from '~proto/google/protobuf/empty';
import {
	Clinic,
	ListClinicsResponse,
} from '~proto/proto/scheduling/scheduling';

export const listClinics: handleUnaryCall<Empty, ListClinicsResponse> = (
	_call,
	callback,
) => {
	const response = ListClinicsResponse.create({
		clinics: [
			Clinic.create({
				clinicId: 'clinic-1',
				clinicInfo: '{ name: "Downtown Clinic", address: "123 Main St" }',
			}),
			Clinic.create({
				clinicId: 'clinic-2',
				clinicInfo: '{ name: "Uptown Clinic", address: "456 Elm St" }',
			}),
		],
	});
	callback(null, response);
};
