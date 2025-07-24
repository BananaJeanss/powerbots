import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
  MessageFlags,
} from "discord.js";
import { addModlog } from "../../utils/modlogs.js";

export const data = new SlashCommandBuilder()
  .setName("kick")
  .setDescription("Kicks a user from the server")
  .addUserOption((option) =>
    option.setName("user").setDescription("The user to kick").setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("The reason for the kick")
      .setRequired(false)
  )
  .addBooleanOption((option) =>
    option
      .setName("dm")
      .setDescription(
        "Whether to send the kick notification to the user via DM, defaults to true"
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
  .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers); // only allow those with kick perms
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

  if (!user) {
    return interaction.editReply({
      content: "You must specify a user to kick.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const member = await interaction.guild.members
    .fetch(user.id)
    .catch(() => null);
  if (!member) {
    return interaction.editReply({
      content: "That user is not in this server.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // role hierarchy check
  if (
    member.roles.highest.position >=
      interaction.member.roles.highest.position &&
    interaction.guild.ownerId !== interaction.user.id // allow owner to kick anyone
  ) {
    return interaction.editReply({
      content:
        "You cannot kick a user with an equal or higher role than yourself.",
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
        "I cannot kick this user because their role is higher or equal to my highest role.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // self, bot, owner, and mod checks
  if (user.id === interaction.user.id) {
    return interaction.editReply({
      content: "You cannot kick yourself.",
      flags: MessageFlags.Ephemeral,
    });
  }
  if (user.id === interaction.client.user.id) {
    return interaction.editReply({
      content: "You cannot kick the bot.",
      flags: MessageFlags.Ephemeral,
    });
  }
  if (user.id === interaction.guild.ownerId) {
    return interaction.editReply({
      content: "You cannot kick the server owner.",
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
      content: "You cannot kick a user with moderation permissions.",
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    var couldDm = false;
    if (dm) {
      // dm first, then kick
      await user
        .send(
          `You have been kicked from ${interaction.guild.name} for: ${reason}`
        )
        .then(() => {
          couldDm = true;
        })
        .catch(() => {
          couldDm = false;
        });
    }

    // add modlog
    await addModlog(interaction, "Kick", user, interaction.user, reason);

    var kickReason = "Kicked by " + interaction.user.tag + " for: " + reason;
    // cut kickReason under 512 characters, discord limit
    if (kickReason.length > 512) {
      kickReason = kickReason.substring(0, 512);
    }
    await member.kick(kickReason);

    // reply to the interaction
    let description = `**${user.tag}** has been kicked from the server for: ${reason}`;
    if (dm && !couldDm) {
      description += "\n\n*Note: Could not DM the user about this kick.*";
    }

    // and embed
    const responseEmbed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("User Kicked")
      .setDescription(description)
      .setTimestamp();

    return interaction.editReply({
      embeds: [responseEmbed],
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  } catch (error) {
    console.error(error);
    return interaction.editReply({
      content: "There was an error trying to kick that user.",
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }
}
