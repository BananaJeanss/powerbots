import { SlashCommandBuilder, PermissionsBitField, MessageFlags } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("logs")
  .setDescription("Log commands")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("toggle")
      .setDescription("Toggle logging for this server")
      .addBooleanOption((option) =>
        option
          .setName("enable")
          .setDescription("Whether to enable or disable logging")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("channel")
      .setDescription("Set the logging channel for this server")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("The channel to log messages to")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("info")
      .setDescription("Get current logging settings for this server")
  )
  .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator); // only allow admins
export async function execute(interaction) {
  const db = interaction.client.db;
  const guildId = interaction.guildId;

  // defer reply
    await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
    });

  // get the current settings for this guild
  let settings = await db
    .collection("guildLogs")
    .findOne({ guild_id: guildId });

  if (!settings) {
    settings = { guild_id: guildId, logging_enabled: false, log_channel: null };
  }

  if (interaction.options.getSubcommand() === "toggle") {
    // toggle logging
    const enable = interaction.options.getBoolean("enable");
    settings.logging_enabled = enable;

    // toggle in db
    await db
      .collection("guildLogs")
      .updateOne(
        { guild_id: guildId },
        { $set: { logging_enabled: enable } },
        { upsert: true }
      );

    return interaction.editReply({
      content: `Logging has been ${
        enable ? "enabled" : "disabled"
      } for this server.`,
      flags: MessageFlags.Ephemeral,
    });
  } else if (interaction.options.getSubcommand() === "channel") {
    // set logging channel
    const channel = interaction.options.getChannel("channel");

    if (!channel.isTextBased()) {
      return interaction.editReply({
        content: "You must select a text channel for logging.",
        flags: MessageFlags.Ephemeral,
      });
    }

    settings.log_channel = channel.id;

    await db
      .collection("guildLogs")
      .updateOne(
        { guild_id: guildId },
        { $set: { log_channel: channel.id } },
        { upsert: true }
      );

    return interaction.editReply({
      content: `Logging channel has been set to <#${channel.id}>.`,
      flags: MessageFlags.Ephemeral,
    });
  } else if (interaction.options.getSubcommand() === "info") {
    // show current settings
    return interaction.editReply({
      content: `Current Logging Settings:\n- Enabled: ${settings.logging_enabled}\n- Channel: ${
        settings.log_channel ? `<#${settings.log_channel}>` : "None"
      }`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
