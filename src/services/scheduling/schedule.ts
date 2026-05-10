import { type handleUnaryCall } from '@grpc/grpc-js';
import { status } from '@grpc/grpc-js';
import { ScheduleRequest } from '~proto/proto/scheduling/scheduling';
import { Response } from '~proto/proto/common/common';
import { logger } from '../../lib/logger';
import { db } from '../../lib/db';
import { appointments } from '../../db/schema';
import { getClinicById, isWithinWorkingHours } from '../clinics/clinics';
import { createEvent, deleteEvent } from '../calendar/calendar';
import { sendMessage } from '../bot/bot';
import { eq, and } from 'drizzle-orm';

export const schedule: handleUnaryCall<ScheduleRequest, Response> = async (
	call,
	callback,
) => {
	const { userId, userName, clinicId, time } = call.request;

	if (!time || !time.startTime || !time.endTime) {
		callback({
			code: status.INVALID_ARGUMENT,
			message: 'Time range is required',
		});
		return;
	}

	const clinic = getClinicById(clinicId);
	if (!clinic) {
		logger.warn({ clinicId }, 'Clinic not found');
		callback({
			code: status.NOT_FOUND,
			message: `Clinic ${clinicId} not found`,
		});
		return;
	}

	const startTime = time.startTime;
	const endTime = time.endTime;

	if (!isWithinWorkingHours(clinicId, startTime)) {
		logger.warn({ clinicId, startTime }, 'Time slot outside working hours');
		callback({
			code: status.INVALID_ARGUMENT,
			message: 'Requested time is outside clinic working hours',
		});
		return;
	}

	const existingAppointment = await db.query.appointments.findFirst({
		where: and(
			eq(appointments.patientId, userId),
			eq(appointments.status, 'confirmed'),
		),
	});

	if (existingAppointment) {
		logger.warn({ userId }, 'Patient already has a confirmed appointment');
		callback({
			code: status.ALREADY_EXISTS,
			message: 'Patient already has a confirmed appointment',
		});
		return;
	}

	let googleEventId: string | null = null;

	try {
		googleEventId = await createEvent(clinic.google_calendar_id, {
			summary: `Appointment: ${userName}`,
			start: startTime,
			end: endTime,
			description: `Patient: ${userName} (ID: ${userId})`,
		});
	} catch (err) {
		logger.error({ err, clinicId }, 'Failed to create calendar event');
		callback({
			code: status.INTERNAL,
			message: 'Failed to create calendar event',
		});
		return;
	}

	if (!googleEventId) {
		callback({
			code: status.INTERNAL,
			message: 'Failed to create calendar event',
		});
		return;
	}

	try {
		await db.insert(appointments).values({
			patientId: userId,
			clinicId,
			startTimeUtc: startTime,
			endTimeUtc: endTime,
			googleCalendarId: clinic.google_calendar_id,
			googleEventId,
			status: 'confirmed',
		});
	} catch (err) {
		logger.error({ err }, 'Failed to insert appointment into database');
		try {
			await deleteEvent(clinic.google_calendar_id, googleEventId);
		} catch (cleanupErr) {
			logger.error(
				{ cleanupErr, googleEventId },
				'Failed to cleanup calendar event',
			);
		}
		callback({
			code: status.INTERNAL,
			message: 'Failed to save appointment',
		});
		return;
	}

	const confirmationMessage = `Your appointment at ${clinic.name} is confirmed for ${startTime.toISOString()}.`;

	await sendMessage(userId, confirmationMessage);

	for (const consultantId of clinic.consultant_whatsapp_ids) {
		await sendMessage(
			consultantId,
			`New appointment: ${userName} at ${clinic.name} on ${startTime.toISOString()}`,
		);
	}

	logger.info(
		{ userId, clinicId, googleEventId },
		'Appointment scheduled successfully',
	);

	const response = Response.create({
		success: true,
		message: `Appointment scheduled for ${userName} at ${clinic.name}`,
	});
	callback(null, response);
};
