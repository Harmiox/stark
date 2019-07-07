import { Command, Message } from '@yamdbf/core';
import { VoiceConnection } from 'discord.js';
import { StarkClient } from '../../client/stark-client';
import { IQueue, IQueuedSong, IVote } from '../../config/interfaces/music.interface';
import { checkChannelPermissions } from '../../middlewares/validate-channel';
import { AppLogger } from '../../util/app-logger';

/**
 * Skip Command
 */

 export default class extends Command<StarkClient> {
	 private logger: AppLogger = new AppLogger('SkipCommand');
	 private votes: Map<string, IVote> = new Map();

	 public constructor() {
		 super({
			desc: 'Vote to skip the currently playing song.',
			group: 'Music',
			guildOnly: true,
			name: 'skip',
			usage: '<prefix>skip'
		 });

		 // Attatch Middleware
		 this.use((message: Message, args: any[]) => checkChannelPermissions(message, args, this));
	 }
 
	 public async action(message: Message, args: string[]): Promise<Message | Message[]> {
		const guildId: string = message.guild.id;
		const guildQueue: IQueue = this.client.queues.get(guildId);
		const voiceConnection: VoiceConnection = this.client.voice.connections.get(guildId);
		if (!guildQueue) { return message.reply('there doesn\'t seem to be an active queue.'); }
		if (guildQueue.songs.length === 0) { return message.reply('it seems the queue is empty.'); }
		if(!message.member.voice.channel) { return message.reply('you\'re not in a voice channel.'); }
		if (!voiceConnection) { return message.reply('I was unable to find a voice connection.'); }

		const vote: IVote = this.votes.get(guildId);
		const threshold = Math.ceil((guildQueue.voiceChannel.members.size - 1) / 3);

		if (vote && vote.count >= 1) {
			// Handle vote
			const alreadyVoted: boolean = vote.users.some(user => user === message.author.id);
			if (alreadyVoted) { return message.reply('you\'ve already voted to skip the song.'); }

			vote.count++;
			vote.users.push(message.author.id);
			if (vote.count >= threshold) { 
				return message.channel.send(this.skip(guildId, guildQueue, voiceConnection)); 
			}
			
		} else {
			// New vote
			const newVote: IVote = {
				count: 1,
				guildId,
				start: Date.now(),
				textChannel: guildQueue.textChannel,
				timeout: null,
				users: [ message.author.id ]
			};

			const time = this.setTimeout(newVote);
			this.votes.set(guildId, newVote);
			const remaining = threshold - 1;

			return message.channel.send(
				`Starting a voteskip.`
				+ ` ${remaining} more vote${remaining > 1 ? 's are' : ' is'} `
				+ `required for the song to be skipped. The vote will end in ${time} seconds.`);
		}
	 }

	 private skip(guildId: string, queue: IQueue, voiceConnection: VoiceConnection): string {
		const currentlyPlaying: IQueuedSong = queue.playing;
		
		if (this.votes.has(guildId)) {
			clearTimeout(this.votes.get(guildId).timeout);
			this.votes.delete(guildId);
		}

		voiceConnection.dispatcher.end();

		return `the song **${currentlyPlaying.title}** was skipped.`;
	}

	 private setTimeout(vote: IVote): number {
		const time = vote.start + 15000 - Date.now() + ((vote.count - 1) * 5000);
		clearTimeout(vote.timeout);
		vote.timeout = setTimeout(() => {
			this.votes.delete(vote.guildId);
			vote.textChannel.send('The vote to skip the current song has ended.');
		}, time) as any;

		return Math.round(time / 1000);
	}
 }