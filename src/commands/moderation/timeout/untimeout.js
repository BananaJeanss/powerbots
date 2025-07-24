import { addModlog } from "#utils/modlogs.js";
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("untimeout")
  .setDescription("Removes a timeout from a user")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("The user to remove the timeout from")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("The reason for removing the timeout")
      .setRequired(false)
  )
  .addBooleanOption((option) =>
    option
      .setName("dm")
      .setDescription(
        "Whether to send the timeout removal notification to the user via DM, defaults to true"
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
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers); // only allow those with timeout perms
export async function execute(interaction) {
  const user = interaction.options.getUser("user");
  const reason =
    interaction.options.getString("reason") || "No reason provided";
  const dm = interaction.options.getBoolean("dm") ?? true;
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  // fetch the member
  const member = await interaction.guild.members
    .fetch(user.id)
    .catch(() => null);
  if (!member) {
    return interaction.editReply({
      content: "The specified user is not a member of this server.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // role hierarchy check
  if (
    member.roles.highest.position >= interaction.member.roles.highest.position &&
    interaction.guild.ownerId !== interaction.user.id // allow owner to untimeout anyone
  ) {
    return interaction.editReply({
      content:
        "You cannot remove a timeout from a user with an equal or higher role than yourself.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // bot role hierarchy check
  if (
    member.roles.highest.position >= interaction.guild.members.me.roles.highest.position
  ) {
    return interaction.editReply({
      content:
        "I cannot remove the timeout because this user's role is higher or equal to my highest role.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // self, bot, owner, and mod checks
  if (user.id === interaction.user.id) {
    return interaction.editReply({
      content: "You cannot remove your own timeout.",
      flags: MessageFlags.Ephemeral,
    });
  }
  if (user.id === interaction.client.user.id) {
    return interaction.editReply({
      content: "You cannot remove the bot's timeout.",
      flags: MessageFlags.Ephemeral,
    });
  }
  if (user.id === interaction.guild.ownerId) {
    return interaction.editReply({
      content: "You cannot remove the server owner's timeout.",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (
    member.permissions.has([
      PermissionFlagsBits.ModerateMembers,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.Administrator,
    ])
  ) {
    return interaction.editReply({
      content: "You cannot remove a timeout from a user with moderation permissions.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // check if actually timed out first
  if (
    !member.communicationDisabledUntilTimestamp ||
    member.communicationDisabledUntilTimestamp < Date.now()
  ) {
    const notTimedOutEmbed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("No Timeout")
      .setDescription(`**${member.user.tag}** is not currently timed out.`)
      .setTimestamp();
    return interaction.editReply({
      embeds: [notTimedOutEmbed],
      flags: MessageFlags.Ephemeral,
    });
  }

  // remove timeout
  try {
    var timeoutReason = "Untimeout by " + interaction.user.tag + " for: " + reason;
    // 512 char limit cut, discord limit
    if (timeoutReason.length > 512) {
      timeoutReason = timeoutReason.slice(0, 512);
    }
    await member.timeout(null, timeoutReason);
    await addModlog(interaction, "Untimeout", user, interaction.user, reason);

    // send DM if enabled
    var couldDm = false;
    if (dm) {
      try {
        await user.send(
          `You have been removed from timeout in **${interaction.guild.name}**.\nReason: ${reason}`
        );
        couldDm = true;
      } catch (error) {
        if (error.code === 50007) {
          // User has DMs disabled
          console.warn(
            `Failed to send DM to ${member.user.tag}: User has DMs disabled.`
          );
        } else {
          console.error(`Failed to send DM to ${member.user.tag}:`, error);
        }
      }
    }

    var description = `Successfully removed timeout from **${member.user.tag}**.`;
    if (reason) {
      description += `\n\n**Reason:** ${reason}`;
    }
    if (dm && !couldDm) {
      description += `\n\n*Note: Could not DM the user about this timeout.*`;
    }
    const respEmbed = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle("Timeout Removed")
      .setDescription(description)
      .setTimestamp();

    // send confirmation message
    await interaction.editReply({
      embeds: [respEmbed],
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
    return;
  } catch (error) {
    console.error("Failed to remove timeout:", error);
    return interaction.editReply({
      content: "An error occurred while trying to remove the timeout.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
