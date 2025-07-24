import { SlashCommandBuilder, PermissionsBitField, MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
	.setName('modlogs')
    .setDescription('Manage modlog settings')
    .addSubcommand(subcommand =>
        subcommand.setName('toggle')
            .setDescription('Toggle modlogs for this server')
            .addBooleanOption(option =>
                option.setName('enable')
                    .setDescription('Whether to enable or disable modlogs')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand.setName('channel')
            .setDescription('Set the channel where to send modlogs to for this server')
            .addChannelOption(option =>
                option.setName('channel')
                    .setDescription('The channel to log modlogs actions to')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand.setName('info')
            .setDescription('Get current modlog settings for this server')
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator); // only allow admins
export async function execute(interaction) {
    const db = interaction.client.db;
    const guildId = interaction.guildId;

    // get the current settings for this guild
    let settings = await db.collection('guildModLogs').findOne({ guild_id: guildId });
    
    if (!settings) {
        settings = { guild_id: guildId, modlogs_enabled: false, modlog_channel: null };
    }

    if (interaction.options.getSubcommand() === 'toggle') { // toggle modlogs
        const enable = interaction.options.getBoolean('enable');
        settings.modlogs_enabled = enable;

        // toggle in db
        await db.collection('guildModLogs').updateOne(
            { guild_id: guildId },
            { $set: { modlogs_enabled: enable } },
            { upsert: true }
        );

        return interaction.reply({
            content: `Modlogs have been ${enable ? 'enabled' : 'disabled'} for this server.`,
            flags: MessageFlags.Ephemeral,
        });
    } else if (interaction.options.getSubcommand() === 'channel') { // set modlog channel
        const channel = interaction.options.getChannel('channel');

        if (!channel.isTextBased()) {
            return interaction.reply({
                content: 'You must select a text channel for modlogs.',
                flags: MessageFlags.Ephemeral,
            });
        }

        settings.modlog_channel = channel.id;

        // update in db
        await db.collection('guildModLogs').updateOne(
            { guild_id: guildId },
            { $set: { modlog_channel: channel.id } },
            { upsert: true }
        );

        return interaction.reply({
            content: `Modlog channel has been set to <#${channel.id}>.`,
            flags: MessageFlags.Ephemeral,
        });
    } else if (interaction.options.getSubcommand() === 'info') { // show current settings
        return interaction.reply({
            content: `Current Modlog Settings:\n- Enabled: ${settings.modlogs_enabled}\n- Channel: ${settings.modlog_channel ? `<#${settings.modlog_channel}>` : 'None'}`,
            flags: MessageFlags.Ephemeral,
        });
    }
}