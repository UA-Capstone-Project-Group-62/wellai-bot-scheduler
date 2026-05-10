import { logger } from '../../lib/logger';
import path from 'path';
import fs from 'fs';

const configPath = path.resolve(process.cwd(), 'config/clinics.json');

interface WorkingHours {
	start: string;
	end: string;
}

interface ClinicConfig {
	id: string;
	name: string;
	address: string;
	phone: string;
	email: string;
	working_hours: Record<string, WorkingHours>;
	consultant_whatsapp_ids: string[];
	google_calendar_id: string;
}

let clinics: ClinicConfig[] = [];

function parseTime(timeStr: string): { hours: number; minutes: number } {
	const parts = timeStr.split(':').map((p) => Number(p) ?? 0);
	return { hours: parts[0] ?? 0, minutes: parts[1] ?? 0 };
}

function timeToMinutes(timeStr: string): number {
	const { hours, minutes } = parseTime(timeStr);
	return hours * 60 + minutes;
}

function getDayName(date: Date): string {
	const days = [
		'Sunday',
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday',
	];
	return days[date.getUTCDay()] ?? 'Monday';
}

export function loadClinics(): ClinicConfig[] {
	try {
		const data = fs.readFileSync(configPath, 'utf-8');
		clinics = JSON.parse(data) as ClinicConfig[];
		logger.info({ count: clinics.length }, 'Loaded clinics config');
		return clinics;
	} catch (err) {
		logger.error({ err, configPath }, 'Failed to load clinics.json');
		throw err;
	}
}

export function getClinicById(id: string): ClinicConfig | undefined {
	return clinics.find((c) => c.id === id);
}

export function getWorkingHours(
	clinicId: string,
	date: Date,
): { start: string; end: string } | null {
	const clinic = getClinicById(clinicId);
	if (!clinic) return null;

	const dayName = getDayName(date);
	return clinic.working_hours[dayName] ?? null;
}

export function isClinicOpen(clinicId: string, date: Date): boolean {
	const hours = getWorkingHours(clinicId, date);
	return hours !== null;
}

export function isWithinWorkingHours(
	clinicId: string,
	dateTime: Date,
): boolean {
	const hours = getWorkingHours(clinicId, dateTime);
	if (!hours) return false;

	const appointmentMinutes =
		dateTime.getUTCHours() * 60 + dateTime.getUTCMinutes();
	const startMinutes = timeToMinutes(hours.start);
	const endMinutes = timeToMinutes(hours.end);

	return appointmentMinutes >= startMinutes && appointmentMinutes < endMinutes;
}

export function getAvailableSlots(
	clinicId: string,
	date: Date,
	slotDurationMinutes: number = 60,
): { start: string; end: string }[] {
	const hours = getWorkingHours(clinicId, date);
	if (!hours) return [];

	const slots: { start: string; end: string }[] = [];
	const startMinutes = timeToMinutes(hours.start);
	const endMinutes = timeToMinutes(hours.end);

	for (
		let current = startMinutes;
		current + slotDurationMinutes <= endMinutes;
		current += slotDurationMinutes
	) {
		const startHour = Math.floor(current / 60);
		const startMin = current % 60;
		const endHour = Math.floor((current + slotDurationMinutes) / 60);
		const endMin = (current + slotDurationMinutes) % 60;

		slots.push({
			start: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`,
			end: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`,
		});
	}

	return slots;
}

export type { ClinicConfig };
