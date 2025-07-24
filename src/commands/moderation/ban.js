import {
  SlashCommandBuilder,
  PermissionsBitField,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { addModlog } from "../../utils/modlogs.js";

export const data = new SlashCommandBuilder()
  .setName("ban")
  .setDescription("Ban a user from the server. Must include user, or id.")
  .addUserOption((option) =>
    option.setName("user").setDescription("The user to ban").setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("id")
      .setDescription("The ID of the user to ban")
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("The reason for the ban")
      .setRequired(false)
  )
  .addBooleanOption((option) =>
    option
      .setName("dm")
      .setDescription(
        "Whether to send the ban notification to the user via DM, defaults to true"
      )
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
  .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers);
export async function execute(interaction) {
  const user = interaction.options.getUser("user");
  const userid = interaction.options.getString("id");
  const reason =
    interaction.options.getString("reason") || "No reason provided";
  const dm = interaction.options.getBoolean("dm") ?? true;
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  // ensure either id or user is specified
  if (!user && !userid) {
    return interaction.editReply({
      content: "You must specify a user or ID to ban.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // prefer user object, fallback to id
  const targetId = user ? user.id : userid;

  // try to fetch member
  const member = await interaction.guild.members
    .fetch(targetId)
    .catch(() => null);

  // if member exists, do all checks
  if (member) {
    // role hierarchy check
    if (
      member.roles.highest.position >=
        interaction.member.roles.highest.position &&
      interaction.guild.ownerId !== interaction.user.id
    ) {
      return interaction.editReply({
        content:
          "You cannot ban a user with an equal or higher role than yourself.",
        flags: MessageFlags.Ephemeral,
      });
    }
    // bot role hierarchy check
    if (
      member.roles.highest.position >=
      interaction.guild.members.me.roles.highest.position
    ) {
      return interaction.editReply({
        content:
          "I cannot ban this user because their role is higher or equal to my highest role.",
        flags: MessageFlags.Ephemeral,
      });
    }
    // self, bot, owner, and mod checks
    if (targetId === interaction.user.id) {
      return interaction.editReply({
        content: "You cannot ban yourself.",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (targetId === interaction.client.user.id) {
      return interaction.editReply({
        content: "You cannot ban the bot.",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (targetId === interaction.guild.ownerId) {
      return interaction.editReply({
        content: "You cannot ban the server owner.",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (
      member.permissions.has([
        PermissionsBitField.Flags.ModerateMembers,
        PermissionsBitField.Flags.KickMembers,
        PermissionsBitField.Flags.BanMembers,
        PermissionsBitField.Flags.Administrator,
      ])
    ) {
      return interaction.editReply({
        content: "You cannot ban a user with moderation permissions.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  // if all checks pass
  // try to fetch the user object for DM and logging
  let targetUser = user;
  if (!targetUser) {
    targetUser = await interaction.client.users
      .fetch(targetId)
      .catch(() => null);
  }

  try {
    let couldDm = false;
    if (dm && targetUser) {
      try {
        await targetUser.send(
          `You have been banned from **${interaction.guild.name}** for: ${reason}`
        );
        couldDm = true;
      } catch (error) {
        if (error.code === 50007) {
          console.log("Could not send DM to user.");
        }
      }
    }

    // add modlog if user object is available
    if (targetUser) {
      await addModlog(interaction, "Ban", targetUser, interaction.user, reason);
    }

    // cut banReason under 512 chars, discord limit
    let banReason = "Banned by " + interaction.user.tag + " for: " + reason;
    if (banReason.length > 512) {
      banReason = banReason.substring(0, 512);
    }
    await interaction.guild.members.ban(targetId, { reason: banReason });

    // reply to the interaction
    let description = targetUser
      ? `**${targetUser.tag}** has been banned from the server for: ${reason}`
      : `User ID \`${targetId}\` has been banned from the server for: ${reason}`;
    if (dm && !couldDm && targetUser) {
      description += "\n\n*Note: Could not DM the user about this ban.*";
    }

    // and embed
    const responseEmbed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("User Banned")
      .setDescription(description)
      .setTimestamp();

    return interaction.editReply({
      embeds: [responseEmbed],
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  } catch (error) {
    console.error(error);
    return interaction.editReply({
      content: "There was an error trying to ban that user.",
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }
}
