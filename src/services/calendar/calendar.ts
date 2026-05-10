import { google, calendar_v3 } from 'googleapis';
import { logger } from '../../lib/logger';
import { env } from '../../lib/env';
import fs from 'fs';
import path from 'path';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

interface CalendarEventInput {
	summary: string;
	start: Date;
	end: Date;
	description?: string;
}

interface TimeRange {
	start: Date;
	end: Date;
}

let calendarClient: calendar_v3.Calendar | null = null;
let isNoopMode = false;

export function initCalendarClient(): void {
	const credentialsPath = env.GOOGLE_APPLICATION_CREDENTIALS;

	if (!credentialsPath) {
		logger.warn(
			'GOOGLE_APPLICATION_CREDENTIALS not set, Calendar API in noop mode',
		);
		isNoopMode = true;
		return;
	}

	try {
		const resolvedPath = path.resolve(process.cwd(), credentialsPath);
		if (!fs.existsSync(resolvedPath)) {
			logger.warn(
				{ credentialsPath: resolvedPath },
				'Service account key file not found, Calendar API in noop mode',
			);
			isNoopMode = true;
			return;
		}

		const auth = new google.auth.GoogleAuth({
			keyFile: resolvedPath,
			scopes: SCOPES,
		});

		calendarClient = google.calendar({ version: 'v3', auth });
		logger.info('Google Calendar client initialized');
	} catch (err) {
		logger.error({ err }, 'Failed to initialize Google Calendar client');
		isNoopMode = true;
	}
}

export async function createEvent(
	calendarId: string,
	input: CalendarEventInput,
): Promise<string | null> {
	if (isNoopMode || !calendarClient) {
		logger.info(
			{ calendarId, summary: input.summary },
			'Noop: would create calendar event',
		);
		return `noop-event-${Date.now()}`;
	}

	try {
		const requestBody: calendar_v3.Schema$Event = {
			summary: input.summary,
			start: {
				dateTime: input.start.toISOString(),
				timeZone: 'UTC',
			},
			end: {
				dateTime: input.end.toISOString(),
				timeZone: 'UTC',
			},
		};

		if (input.description !== undefined) {
			requestBody.description = input.description;
		}

		const event = await calendarClient.events.insert({
			calendarId,
			requestBody,
		});

		const eventId = event.data?.id ?? null;
		logger.info({ calendarId, eventId }, 'Created calendar event');
		return eventId;
	} catch (err) {
		logger.error({ err, calendarId }, 'Failed to create calendar event');
		throw err;
	}
}

export async function deleteEvent(
	calendarId: string,
	eventId: string,
): Promise<void> {
	if (isNoopMode || !calendarClient) {
		logger.info({ calendarId, eventId }, 'Noop: would delete calendar event');
		return;
	}

	try {
		await calendarClient.events.delete({
			calendarId,
			eventId,
		});
		logger.info({ calendarId, eventId }, 'Deleted calendar event');
	} catch (err) {
		logger.error(
			{ err, calendarId, eventId },
			'Failed to delete calendar event',
		);
		throw err;
	}
}

export async function queryFreeBusy(
	calendarId: string,
	timeMin: Date,
	timeMax: Date,
): Promise<TimeRange[]> {
	if (isNoopMode || !calendarClient) {
		logger.info({ calendarId }, 'Noop: would query free busy');
		return [];
	}

	try {
		const response = await calendarClient.freebusy.query({
			requestBody: {
				timeMin: timeMin.toISOString(),
				timeMax: timeMax.toISOString(),
				items: [{ id: calendarId }],
			},
		});

		const calendarBusy = response.data.calendars?.[calendarId];
		if (!calendarBusy) return [];

		const busyRanges = calendarBusy.busy || [];
		return busyRanges.map((range) => ({
			start: new Date(range.start ?? Date.now()),
			end: new Date(range.end ?? Date.now()),
		}));
	} catch (err) {
		logger.error({ err, calendarId }, 'Failed to query free busy');
		return [];
	}
}

export function isInNoopMode(): boolean {
	return isNoopMode;
}
