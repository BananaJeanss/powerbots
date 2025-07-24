import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
	.setName('ping')
	.setDescription('Replies with Pong!');
export async function execute(interaction) {
	await interaction.deferReply();

	const latency = Date.now() - interaction.createdTimestamp;
	await interaction.editReply(`Pong! Latency: ${latency}ms`);
}
