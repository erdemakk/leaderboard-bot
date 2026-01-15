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
	sheetLink: String,
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
			const targetMessage = messages.find(msg => msg.content.includes('docs.google.com/spreadsheets'));

			if (!targetMessage) {
				return message.reply('I could not find any Google Sheets link in the last 15 messages!');
			}

			const urlRegex = /(https?:\/\/[^\s]+)/g;
			const sheetUrl = targetMessage.content.match(urlRegex)[0];

			await Leaderboard.findOneAndUpdate(
				{},
				{ sheetLink: sheetUrl, updatedAt: new Date() },
				{ upsert: true }
			);

			message.reply(`The leaderboard has been updated: ${sheetUrl}`);
		} catch (error) {
			console.error(error);
			message.reply('An error occurred while processing the command.');
		}
	}
});

client.login(process.env.TOKEN);