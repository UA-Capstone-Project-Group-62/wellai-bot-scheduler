import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { type handleUnaryCall } from '@grpc/grpc-js';
import {
	QueryRequest,
	QueryResponse,
	TimeRange,
} from '~proto/proto/scheduling/scheduling';
import { logger } from '../../lib/logger';
import {
	getClinicById,
	getAvailableSlots,
	isClinicOpen,
} from '../clinics/clinics';
import { queryFreeBusy } from '../calendar/calendar';

dayjs.extend(utc);

export const query: handleUnaryCall<QueryRequest, QueryResponse> = async (
	call,
	callback,
) => {
	const { clinicId, days } = call.request;
	const numDays = days > 0 ? days : 1;

	const clinic = getClinicById(clinicId);
	if (!clinic) {
		logger.warn({ clinicId }, 'Clinic not found');
		const response = QueryResponse.create({ availableSlots: [] });
		callback(null, response);
		return;
	}

	const availableSlots: TimeRange[] = [];
	const today = dayjs();

	for (let d = 0; d < numDays; d++) {
		const currentDate = today.add(d, 'day');

		if (!isClinicOpen(clinicId, currentDate.toDate())) {
			continue;
		}

		const slots = getAvailableSlots(clinicId, currentDate.toDate(), 60);

		const startOfDay = currentDate.startOf('day').toDate();
		const endOfDay = currentDate.endOf('day').toDate();

		const busyRanges = await queryFreeBusy(
			clinic.google_calendar_id,
			startOfDay,
			endOfDay,
		);

		for (const slot of slots) {
			const slotStart = parseSlotTime(slot.start, currentDate);
			const slotEnd = parseSlotTime(slot.end, currentDate);

			let isAvailable = true;
			for (const busy of busyRanges) {
				if (slotStart < busy.end && slotEnd > busy.start) {
					isAvailable = false;
					break;
				}
			}

			if (isAvailable) {
				availableSlots.push(
					TimeRange.create({
						startTime: slotStart,
						endTime: slotEnd,
					}),
				);
			}
		}
	}

	logger.info(
		{ clinicId, numDays, availableSlots: availableSlots.length },
		'Query completed',
	);

	const response = QueryResponse.create({ availableSlots });
	callback(null, response);
};

function parseSlotTime(timeStr: string, date: dayjs.Dayjs): Date {
	const parts = timeStr.split(':').map(Number);
	const hours = parts[0] ?? 0;
	const minutes = parts[1] ?? 0;
	return date.hour(hours).minute(minutes).second(0).millisecond(0).toDate();
}
