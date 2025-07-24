import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { addModlog } from "#utils/modlogs.js";

export const data = new SlashCommandBuilder()
  .setName("unban")
  .setDescription("Unbans a user from the server, either via username or id.")
  .addStringOption((option) =>
    option
      .setName("user")
      .setDescription("The username or ID to unban")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("The reason for the unban")
      .setRequired(false)
  )
  .addBooleanOption((option) =>
    option
      .setName("ephemeral")
      .setDescription(
        "Whether to make the response ephemeral (only visible to you), defaults to false"
      )
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction) {
  const userInput = interaction.options.getString("user");
  const reason =
    interaction.options.getString("reason") || "No reason provided";
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  // id/username check
  const userType = userInput.match(/^\d+$/) ? "id" : "username";

  if (!userType) {
    return interaction.editReply({
      content: "You must specify a valid user ID or username to unban.",
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }

  // fetch the ban list
  const bans = await interaction.guild.bans.fetch();

  // find the user in the ban list
  const ban = bans.find((b) =>
    userType === "id" ? b.user.id === userInput : b.user.username === userInput
  );

  if (!ban) {
    return interaction.editReply({
      content: `${userInput} is not banned.`,
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }

  // self, bot, and owner checks
  if (ban.user.id === interaction.user.id) {
    return interaction.editReply({
      content: "You cannot unban yourself.",
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }
  if (ban.user.id === interaction.client.user.id) {
    return interaction.editReply({
      content: "You cannot unban the bot.",
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }
  if (ban.user.id === interaction.guild.ownerId) {
    return interaction.editReply({
      content: "You cannot unban the server owner.",
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }

  // unban the user
  try {
    var unbanReason = `Unbanned by ${interaction.user.tag} (${interaction.user.id}) for: ${reason}`;

    // 512 char discord limit
    if (unbanReason.length > 512) {
      unbanReason = unbanReason.slice(0, 512);
    }

    await interaction.guild.members.unban(ban.user.id, unbanReason);
  } catch (error) {
    const errEmbed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("Unban Failed")
      .setDescription(
        `Failed to unban ${ban.user.tag} (${ban.user.id})\nError: ${error.message}`
      );
    return interaction.editReply({
      embeds: [errEmbed],
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }

  // log the unban
  await addModlog(interaction, "Unban", ban.user, interaction.user, reason);

  // and embed
  const embed = new EmbedBuilder()
    .setColor("#00FF00")
    .setTitle("User Unbanned")
    .setDescription(
      `Unbanned ${ban.user.tag} (${ban.user.id})\nReason: ${reason}`
    )
    .setTimestamp();
  await interaction.editReply({
    embeds: [embed],
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });
}
