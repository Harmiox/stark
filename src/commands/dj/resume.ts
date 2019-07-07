import { Command, Message } from '@yamdbf/core';
import { VoiceConnection } from 'discord.js';
import { StarkClient } from '../../client/stark-client';
import { IQueue } from '../../config/interfaces/music.interface';
import { checkDjPermissions } from '../../middlewares/validate-dj';
import { AppLogger } from '../../util/app-logger';

/**
 * Resume Command
 */

 export default class extends Command<StarkClient> {
	 private logger: AppLogger = new AppLogger('ResumeCommand');

	 public constructor() {
		 super({
			desc: 'Resume the music from being paused.',
			group: 'DJ',
			guildOnly: true,
			name: 'resume',
			usage: '<prefix>resume'
		 });

		 // Attatch Middleware
		this.use((message: Message, args: any[]) => checkDjPermissions(message, args, this));
	 }

	 public async action(message: Message, args: string[]): Promise<Message | Message[]> {
		const guildQueue: IQueue = this.client.queues.get(message.guild.id);
		const voiceConnection: VoiceConnection = this.client.voice.connections.get(message.guild.id);
		if (!guildQueue) { return message.reply('there doesn\'t seem to be an active queue.'); }
		if (guildQueue.songs.length === 0) { return message.reply('it seems the queue is empty.'); }
		if(!message.member.voice.channel) { return message.reply('you\'re not in a voice channel.'); }
		if (!voiceConnection) { return message.reply('I was unable to find a voice connection.'); }
		voiceConnection.dispatcher.resume();

		return message.reply('I\'ve resumed the music for you.');
	 }
 }