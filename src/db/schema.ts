import { pgTable, bigint, varchar, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const appointmentStatusEnum = pgEnum('appointment_status', [
	'confirmed',
	'cancelled',
]);

export const appointments = pgTable('appointments', {
	id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
	patientId: varchar('patient_id', { length: 255 }).notNull(),
	clinicId: varchar('clinic_id', { length: 255 }).notNull(),
	startTimeUtc: timestamp('start_time_utc', { withTimezone: true }).notNull(),
	endTimeUtc: timestamp('end_time_utc', { withTimezone: true }).notNull(),
	googleCalendarId: varchar('google_calendar_id', { length: 255 }).notNull(),
	googleEventId: varchar('google_event_id', { length: 255 }).notNull(),
	status: appointmentStatusEnum('status').notNull().default('confirmed'),
	notified24h: boolean('notified_24h').default(false),
	notified2h: boolean('notified_2h').default(false),
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;