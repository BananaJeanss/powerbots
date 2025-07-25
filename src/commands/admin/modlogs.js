import {
  SlashCommandBuilder,
  PermissionsBitField,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { getUserModlogs } from "#utils/modlogs.js";

export const data = new SlashCommandBuilder()
  .setName("modlogs")
  .setDescription("Manage modlog settings")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("toggle")
      .setDescription("Toggle modlogs for this server")
      .addBooleanOption((option) =>
        option
          .setName("enable")
          .setDescription("Whether to enable or disable modlogs")
          .setRequired(true)
      )
      .addBooleanOption((option) =>
        option
          .setName("ephemeral")
          .setDescription(
            "Whether to make the response ephemeral (only visible to you), defaults to false"
          )
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("channel")
      .setDescription(
        "Set the channel where to send modlogs to for this server"
      )
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("The channel to log modlogs actions to")
          .setRequired(true)
      )
      .addBooleanOption((option) =>
        option
          .setName("ephemeral")
          .setDescription(
            "Whether to make the response ephemeral (only visible to you), defaults to false"
          )
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("info")
      .setDescription("Get current modlog settings for this server")
      .addBooleanOption((option) =>
        option
          .setName("ephemeral")
          .setDescription(
            "Whether to make the response ephemeral (only visible to you), defaults to false"
          )
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("view")
      .setDescription("View modlogs for a user")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user to view modlogs for")
          .setRequired(true)
      )
      .addBooleanOption((option) =>
        option
          .setName("ephemeral")
          .setDescription(
            "Whether to make the response ephemeral (only visible to you), defaults to false"
          )
          .setRequired(false)
      )
  )
  // only allow moderators to view user modlogs, admins only can change channel/toggle
  .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers);
export async function execute(interaction) {
  const db = interaction.client.db;
  const guildId = interaction.guildId;
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  // check if user is allowed to run specified subcommand
  const subcommand = interaction.options.getSubcommand();
  if (subcommand === "view" || subcommand === "info") {
    // only allow users with ModerateMembers permission to view modlogs
    if (
      !interaction.member.permissions.has([
        PermissionsBitField.Flags.ModerateMembers,
        PermissionsBitField.Flags.Administrator,
      ])
    ) {
      return interaction.editReply({
        content: "You do not have permission to view modlogs.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
  if (subcommand === "toggle" || subcommand === "channel") {
    // only allow admins to change modlog settings
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return interaction.editReply({
        content: "You do not have permission to change modlog settings.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  // get the current settings for this guild if needed
  let settings;
  if (
    subcommand === "toggle" ||
    subcommand === "channel" ||
    subcommand === "info"
  ) {
    settings = await db
      .collection("guildModLogs")
      .findOne({ guild_id: guildId });

    if (!settings) {
      settings = {
        guild_id: guildId,
        modlogs_enabled: false,
        modlog_channel: null,
      };
    }
  }

  if (interaction.options.getSubcommand() === "toggle") {
    // toggle modlogs
    const enable = interaction.options.getBoolean("enable");
    settings.modlogs_enabled = enable;

    // toggle in db
    await db
      .collection("guildModLogs")
      .updateOne(
        { guild_id: guildId },
        { $set: { modlogs_enabled: enable } },
        { upsert: true }
      );

    return interaction.editReply({
      content: `Modlogs have been ${
        enable ? "enabled" : "disabled"
      } for this server.`,
      flags: MessageFlags.Ephemeral,
    });
  } else if (interaction.options.getSubcommand() === "channel") {
    // set modlog channel
    const channel = interaction.options.getChannel("channel");

    if (!channel.isTextBased()) {
      return interaction.editReply({
        content: "You must select a text channel for modlogs.",
        flags: MessageFlags.Ephemeral,
      });
    }

    settings.modlog_channel = channel.id;

    // update in db
    await db
      .collection("guildModLogs")
      .updateOne(
        { guild_id: guildId },
        { $set: { modlog_channel: channel.id } },
        { upsert: true }
      );

    return interaction.editReply({
      content: `Modlog channel has been set to <#${channel.id}>.`,
      flags: MessageFlags.Ephemeral,
    });
  } else if (interaction.options.getSubcommand() === "info") {
    // show current settings
    return interaction.editReply({
      content: `Current Modlog Settings:\n- Enabled: ${
        settings.modlogs_enabled
      }\n- Channel: ${
        settings.modlog_channel ? `<#${settings.modlog_channel}>` : "None"
      }`,
      flags: MessageFlags.Ephemeral,
    });
  } else if (subcommand === "view") {
    // view modlogs for a user
    const user = interaction.options.getUser("user");

    // fetch the user's modlogs
    const modlogs = await getUserModlogs(
      interaction.client.db,
      interaction.guildId,
      user.id
    );

    // Helper for building embed page
    function modlogsEmbedBuilder(user, modlogs, page, totalPages) {
      const embed = new EmbedBuilder()
        .setTitle(`${user.tag}'s Modlogs`)
        .setColor("#3498db")
        .setTimestamp();

      if (modlogs.length > 0) {
        embed.addFields(
          modlogs.map((log) => ({
            name: `Case #${log.id} | ${log.action}`,
            value:
              `**Moderator:** <@${log.moderatorId}>\n` +
              `**Reason:** ${log.reason || "No reason provided"}\n` +
              `**Date:** <t:${Math.floor(
                new Date(log.timestamp).getTime() / 1000
              )}:f>`,
            inline: false,
          }))
        );
        embed.setFooter({ text: `Page ${page + 1} of ${totalPages}` });
      } else {
        embed.setDescription("No modlogs found.");
      }

      return embed;
    }

    const modlogsPerPage = 10;
    const totalPages = Math.max(
      1,
      Math.ceil((modlogs?.length || 0) / modlogsPerPage)
    );
    let page = 0;

    function getPageModlogs(page) {
      return modlogs.slice(page * modlogsPerPage, (page + 1) * modlogsPerPage);
    }

    // if no modlogs, just reply with the embed
    if (!modlogs || modlogs.length === 0) {
      return interaction.editReply({
        embeds: [modlogsEmbedBuilder(user, [], 0, 1)],
        flags: ephemeral ? MessageFlags.Ephemeral : undefined,
      });
    }

    // buttons
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } =
      await import("discord.js");
    const getRow = (page) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("⬅️ Previous")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next ➡️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages - 1)
      );
    };

    // send initial embed
    const message = await interaction.editReply({
      embeds: [
        modlogsEmbedBuilder(user, getPageModlogs(page), page, totalPages),
      ],
      components: totalPages > 1 ? [getRow(page)] : [],
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });

    if (totalPages === 1) return;

    // set up collector for button interactions
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000, // timeout after 2 minutes
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "prev" && page > 0) page--;
      if (i.customId === "next" && page < totalPages - 1) page++;
      await i.update({
        embeds: [
          modlogsEmbedBuilder(user, getPageModlogs(page), page, totalPages),
        ],
        components: [getRow(page)],
      });
    });

    collector.on("end", async () => {
      if (message.editable) {
        await message.edit({ components: [] });
      }
    });
  }
}
