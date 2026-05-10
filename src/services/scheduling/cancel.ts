import { type handleUnaryCall } from '@grpc/grpc-js';
import { status } from '@grpc/grpc-js';
import { CancelRequest } from '~proto/proto/scheduling/scheduling';
import { Response } from '~proto/proto/common/common';
import { logger } from '../../lib/logger';
import { db } from '../../lib/db';
import { appointments } from '../../db/schema';
import { getClinicById } from '../clinics/clinics';
import { deleteEvent } from '../calendar/calendar';
import { sendMessage } from '../bot/bot';
import { eq, and } from 'drizzle-orm';

export const cancel: handleUnaryCall<CancelRequest, Response> = async (
	call,
	callback,
) => {
	const { userId } = call.request;

	const appointment = await db.query.appointments.findFirst({
		where: and(
			eq(appointments.patientId, userId),
			eq(appointments.status, 'confirmed'),
		),
	});

	if (!appointment) {
		logger.warn({ userId }, 'No confirmed appointment found');
		callback({
			code: status.NOT_FOUND,
			message: 'No confirmed appointment found for this user',
		});
		return;
	}

	try {
		await deleteEvent(appointment.googleCalendarId, appointment.googleEventId);
	} catch (err) {
		logger.error({ err, appointment }, 'Failed to delete calendar event');
	}

	try {
		await db
			.update(appointments)
			.set({ status: 'cancelled' })
			.where(eq(appointments.id, appointment.id));
	} catch (err) {
		logger.error(
			{ err, appointmentId: appointment.id },
			'Failed to update appointment status',
		);
		callback({
			code: status.INTERNAL,
			message: 'Failed to cancel appointment',
		});
		return;
	}

	const clinic = getClinicById(appointment.clinicId);

	const cancellationMessage = `Your appointment has been cancelled.`;

	await sendMessage(userId, cancellationMessage);

	if (clinic) {
		for (const consultantId of clinic.consultant_whatsapp_ids) {
			await sendMessage(
				consultantId,
				`Appointment cancelled: ${userId} at ${clinic.name}`,
			);
		}
	}

	logger.info(
		{ userId, appointmentId: appointment.id },
		'Appointment cancelled successfully',
	);

	const response = Response.create({
		success: true,
		message: 'Appointment cancelled successfully',
	});
	callback(null, response);
};
