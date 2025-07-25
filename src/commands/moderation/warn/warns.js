import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import { getUserWarns } from "#utils/modlogs.js";

export const data = new SlashCommandBuilder()
  .setName("warns")
  .setDescription("View the warns of a user")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("The user to view warns for")
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
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction) {
  const user = interaction.options.getUser("user");
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  // helper for building embed page
  function warnsEmbedBuilder(user, warns, page, totalPages) {
    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}'s Warns`)
      .setColor("#ffcc00")
      .setTimestamp();

    if (warns.length > 0) {
      embed.addFields(
        warns.map((warn) => ({
          name: `Case #${warn.id}`,
          value:
            `**Moderator:** <@${warn.moderatorId}>\n` +
            `**Reason:** ${warn.reason || "No reason provided"}\n` +
            `**Date:** <t:${Math.floor(new Date(warn.timestamp).getTime() / 1000)}:f>`,
          inline: false,
        }))
      );
      embed.setFooter({ text: `Page ${page + 1} of ${totalPages}` });
    } else {
      embed.setDescription("No warns found.");
    }

    return embed;
  }

  // fetch the user's warns
  const warns = await getUserWarns(
    interaction.client.db,
    interaction.guildId,
    user.id
  );

  const warnsPerPage = 10;
  const totalPages = Math.max(
    1,
    Math.ceil((warns?.length || 0) / warnsPerPage)
  );
  let page = 0;

  function getPageWarns(page) {
    return warns.slice(page * warnsPerPage, (page + 1) * warnsPerPage);
  }

  // if no warns, just reply with the embed
  if (!warns || warns.length === 0) {
    return interaction.editReply({
      embeds: [warnsEmbedBuilder(user, [], 0, 1)],
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }

  // buttons
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
    embeds: [warnsEmbedBuilder(user, getPageWarns(page), page, totalPages)],
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
      embeds: [warnsEmbedBuilder(user, getPageWarns(page), page, totalPages)],
      components: [getRow(page)],
    });
  });

  collector.on("end", async () => {
    if (message.editable) {
      await message.edit({ components: [] });
    }
  });
}
