import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';

export const cooldown = 5;
export const data = new SlashCommandBuilder()
	.setName('togglecommand')
    .setDescription('Toggles a command on or off for this server.')
    .addStringOption(option =>
        option.setName('command')
            .setDescription('The command to toggle')
            .setRequired(true)
    )
    .addBooleanOption(option =>
        option.setName('enable')
            .setDescription('Whether to enable or disable the command')
            .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator); // only allow admins
export async function execute(interaction) {

    const commandName = interaction.options.getString('command');
    const db = interaction.client.db;
    const guildId = interaction.guildId;

    // check if the command actually exists
    const command = interaction.client.commands.get(commandName);
    if (!command) {
        return interaction.reply({
            content: `The command \`${commandName}\` does not exist.`,
            ephemeral: true,
        });
    }

    // get the current settings for this guild
    let settings = await db.collection('guildCommands').findOne({ guild_id: guildId });
    
    if (!settings) {
        settings = { guild_id: guildId, disabled_commands: [] };
    }

   // toggle the command
    const enable = interaction.options.getBoolean('enable');
    if (enable) {
        // check if already enabled
        if (!settings.disabled_commands.includes(commandName)) {
            return interaction.reply({
                content: `The command \`${commandName}\` is already enabled.`,
                ephemeral: true,
            });
        }
        // enable the command
        settings.disabled_commands = settings.disabled_commands.filter(cmd => cmd !== commandName);
    } else {
        // check if already disabled
        if (settings.disabled_commands.includes(commandName)) {
            return interaction.reply({
                content: `The command \`${commandName}\` is already disabled.`,
                ephemeral: true,
            });
        }
        // disable the command
        settings.disabled_commands.push(commandName);
    }

    // update the database
    await db.collection('guildCommands').updateOne(
        { guild_id: guildId },
        { $set: { disabled_commands: settings.disabled_commands } },
        { upsert: true }
    );

    return interaction.reply({
        content: `The \`${commandName}\` command has been ${enable ? 'enabled' : 'disabled'} for this server.`,
        ephemeral: true,
    });
}