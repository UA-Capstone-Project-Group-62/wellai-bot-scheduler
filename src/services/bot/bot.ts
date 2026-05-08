import { Client, ChannelCredentials } from '@grpc/grpc-js';
import { BotServiceClient, Message } from '~proto/proto/bot/bot';
import { Response } from '~proto/proto/common/common';
import { logger } from '../../lib/logger';
import { env } from '../../lib/env';

let botClient: BotServiceClient | null = null;

export function initBotClient(): void {
	const botAddress = env.BOT_SERVICE_ADDRESS;

	if (!botAddress) {
		logger.warn('BOT_SERVICE_ADDRESS not set, bot notifications disabled');
		return;
	}

	botClient = new BotServiceClient(
		botAddress,
		ChannelCredentials.createInsecure(),
	);

	logger.info({ botAddress }, 'Bot service client initialized');
}

export async function sendMessage(
	userId: string,
	content: string,
): Promise<boolean> {
	if (!botClient) {
		logger.error('Bot service client not initialized');
		return false;
	}

	return new Promise((resolve) => {
		const message = Message.create({
			userId,
			content,
		});

		botClient!.send(
			message,
			(err: Error | null, response: Response | undefined) => {
				if (err) {
					logger.error(
						{ err, userId },
						'Failed to send message via bot service',
					);
					resolve(false);
					return;
				}
				logger.info(
					{ userId, success: response?.success },
					'Message sent via bot service',
				);
				resolve(response?.success ?? false);
			},
		);
	});
}

export function isBotClientConnected(): boolean {
	return botClient !== null;
}