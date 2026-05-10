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

export const query: handleUnaryCall<QueryRequest, QueryResponse> = async (
	call,
	callback,
) => {
	const { clinicId } = call.request;

	const clinic = getClinicById(clinicId);
	if (!clinic) {
		logger.warn({ clinicId }, 'Clinic not found');
		const response = QueryResponse.create({ availableSlots: [] });
		callback(null, response);
		return;
	}

	const today = new Date();
	if (!isClinicOpen(clinicId, today)) {
		logger.info({ clinicId }, 'Clinic is not open today');
		const response = QueryResponse.create({ availableSlots: [] });
		callback(null, response);
		return;
	}

	const slots = getAvailableSlots(clinicId, today, 60);

	const startOfDay = new Date(today);
	startOfDay.setUTCHours(0, 0, 0, 0);
	const endOfDay = new Date(today);
	endOfDay.setUTCHours(23, 59, 59, 999);

	const busyRanges = await queryFreeBusy(
		clinic.google_calendar_id,
		startOfDay,
		endOfDay,
	);

	const availableSlots = slots
		.filter((slot) => {
			const slotStart = parseSlotTime(slot.start, today);
			const slotEnd = parseSlotTime(slot.end, today);

			for (const busy of busyRanges) {
				if (slotStart < busy.end && slotEnd > busy.start) {
					return false;
				}
			}
			return true;
		})
		.map((slot) => {
			const slotStart = parseSlotTime(slot.start, today);
			const slotEnd = parseSlotTime(slot.end, today);
			return TimeRange.create({
				startTime: slotStart,
				endTime: slotEnd,
			});
		});

	logger.info(
		{
			clinicId,
			totalSlots: slots.length,
			availableSlots: availableSlots.length,
		},
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
