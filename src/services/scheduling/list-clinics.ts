import { type handleUnaryCall } from '@grpc/grpc-js';
import { Empty } from '~proto/google/protobuf/empty';
import {
	Clinic,
	ListClinicsResponse,
} from '~proto/proto/scheduling/scheduling';
import { loadClinics, type ClinicConfig } from '../clinics/clinics';
import { logger } from '../../lib/logger';

export const listClinics: handleUnaryCall<Empty, ListClinicsResponse> = (
	_call,
	callback,
) => {
	const clinics = loadClinics();

	const protoClinics = clinics.map((clinic: ClinicConfig) => {
		const info = {
			name: clinic.name,
			address: clinic.address,
			phone: clinic.phone,
			email: clinic.email,
		};
		return Clinic.create({
			clinicId: clinic.id,
			clinicInfo: JSON.stringify(info),
		});
	});

	logger.info({ count: clinics.length }, 'Returning clinics list');

	const response = ListClinicsResponse.create({
		clinics: protoClinics,
	});
	callback(null, response);
};
