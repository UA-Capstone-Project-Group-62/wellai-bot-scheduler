import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import cron, { ScheduledTask } from 'node-cron';
import { db } from '../../lib/db';
import { appointments } from '../../db/schema';
import { sendMessage } from '../bot/bot';
import { getClinicById } from '../clinics/clinics';
import { logger } from '../../lib/logger';
import { eq, and, gte, lte } from 'drizzle-orm';

dayjs.extend(utc);

let cronJob: ScheduledTask | null = null;

export function startReminderJob(): void {
	cronJob = cron.schedule('* * * * *', async () => {
		await checkReminders();
	});
	logger.info('Reminder cron job started');
}

export function stopReminderJob(): void {
	if (cronJob) {
		cronJob.stop();
		cronJob = null;
		logger.info('Reminder cron job stopped');
	}
}

async function checkReminders(): Promise<void> {
	const now = dayjs();

	const window24hStart = now.add(23, 'hour');
	const window24hEnd = now.add(24, 'hour').add(10, 'minute');

	const window2hStart = now.add(1, 'hour');
	const window2hEnd = now.add(2, 'hour').add(10, 'minute');

	const appointments24h = await db.query.appointments.findMany({
		where: and(
			eq(appointments.status, 'confirmed'),
			eq(appointments.notified24h, false),
			gte(appointments.startTimeUtc, window24hStart.toDate()),
			lte(appointments.startTimeUtc, window24hEnd.toDate()),
		),
	});

	for (const appt of appointments24h) {
		await sendReminder(appt, '24h');
		await db
			.update(appointments)
			.set({ notified24h: true })
			.where(eq(appointments.id, appt.id));
	}

	const appointments2h = await db.query.appointments.findMany({
		where: and(
			eq(appointments.status, 'confirmed'),
			eq(appointments.notified2h, false),
			gte(appointments.startTimeUtc, window2hStart.toDate()),
			lte(appointments.startTimeUtc, window2hEnd.toDate()),
		),
	});

	for (const appt of appointments2h) {
		await sendReminder(appt, '2h');
		await db
			.update(appointments)
			.set({ notified2h: true })
			.where(eq(appointments.id, appt.id));
	}
}

async function sendReminder(
	appt: typeof appointments.$inferSelect,
	type: '24h' | '2h',
): Promise<void> {
	const clinic = getClinicById(appt.clinicId);
	const timeLabel = type === '24h' ? '24 hours' : '2 hours';

	const patientMessage = `Reminder: Your appointment at ${clinic?.name ?? 'the clinic'} is in ${timeLabel}.`;
	await sendMessage(appt.patientId, patientMessage);

	if (clinic) {
		for (const consultantId of clinic.consultant_whatsapp_ids) {
			await sendMessage(
				consultantId,
				`Reminder: Appointment for ${appt.patientId} at ${clinic.name} is in ${timeLabel}.`,
			);
		}
	}

	logger.info(
		{ appointmentId: appt.id, patientId: appt.patientId, type },
		'Sent reminder notification',
	);
}
