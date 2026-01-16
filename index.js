import { Client, GatewayIntentBits } from 'discord.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
	]
});

const leaderboardSchema = new mongoose.Schema({
	sheetLink: { type: String, required: true },
	updatedAt: { type: Date, default: Date.now }
});

const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

client.once('ready', (c) => {
	console.log(`${c.user.tag} is online and ready!`);

	mongoose.connect(process.env.MONGO_URI)
		.then(() => console.log('Connected to MongoDB'))
		.catch(err => console.error('MongoDB connection error:', err));
});

client.on('messageCreate', async (message) => {
	if (message.author.bot) return;

	if (message.content === '!updateboard') {
		try {
			const messages = await message.channel.messages.fetch({ limit: 15 });
			const targetMessage = messages.find(msg => msg.content && msg.content.includes('docs.google.com/spreadsheets'));

			if (!targetMessage) {
				await message.reply('Error: Google Sheets link not found.');
				return;
			}

			const urlRegex = /(https?:\/\/[^\s]+)/g;
			const match = targetMessage.content.match(urlRegex);
			const rawUrl = match ? match[0] : null;

			if (rawUrl) {
				const baseUrl = rawUrl.split('/edit')[0];
				const formattedUrl = `${baseUrl}/gviz/tq?tqx=out:csv`;

				await Leaderboard.findOneAndUpdate(
					{},
					{ $set: { sheetLink: formattedUrl, updatedAt: new Date() } },
					{ upsert: true, new: true }
				);

				await message.reply(`**Leaderboard data source has been successfully synchronized.**\n\n**Source URL:** ${formattedUrl}`);
			}
		} catch (error) {
			console.error('Update Error:', error);
			await message.reply('System Error: Database synchronization failed.');
		}
	}
});

client.login(process.env.TOKEN).catch(err => console.error('Login Error:', err));