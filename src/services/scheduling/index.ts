import {
	SchedulingServiceService,
	type SchedulingServiceServer,
} from '~proto/proto/scheduling/scheduling';
import { cancel } from './cancel';
import { listClinics } from './list-clinics';
import { query } from './query';
import { schedule } from './schedule';

export const schedulingService = SchedulingServiceService;

export const schedulingImpl: SchedulingServiceServer = {
	schedule,
	listClinics,
	query,
	cancel,
};
