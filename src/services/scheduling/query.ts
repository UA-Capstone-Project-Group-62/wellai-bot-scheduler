import { type handleUnaryCall } from '@grpc/grpc-js';
import {
	QueryRequest,
	QueryResponse,
	TimeRange,
} from '~proto/proto/scheduling/scheduling';
import { logger } from '../../lib/logger';
import { getClinicById, getAvailableSlots, isClinicOpen } from '../clinics/clinics';
import { queryFreeBusy } from '../calendar/calendar';

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
	const today = new Date();

	for (let d = 0; d < numDays; d++) {
		const currentDate = new Date(today);
		currentDate.setUTCDate(today.getUTCDate() + d);

		if (!isClinicOpen(clinicId, currentDate)) {
			continue;
		}

		const slots = getAvailableSlots(clinicId, currentDate, 60);

		const startOfDay = new Date(currentDate);
		startOfDay.setUTCHours(0, 0, 0, 0);
		const endOfDay = new Date(currentDate);
		endOfDay.setUTCHours(23, 59, 59, 999);

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

function parseSlotTime(timeStr: string, date: Date): Date {
	const parts = timeStr.split(':').map((p) => Number(p) ?? 0);
	const hours = parts[0] ?? 0;
	const minutes = parts[1] ?? 0;
	const result = new Date(date);
	result.setUTCHours(hours, minutes, 0, 0);
	return result;
}
