import {
  SlashCommandBuilder,
  PermissionsBitField,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { addModlog } from "#utils/modlogs.js";

export const data = new SlashCommandBuilder()
  .setName("timeout")
  .setDescription("Timeout a user for a specified duration")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("The user to timeout")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("duration")
      .setDescription(
        'The duration of the timeout (e.g., "1d", "1h30m", "10s")'
      )
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("The reason for the timeout")
      .setRequired(false)
  )
  .addBooleanOption((option) =>
    option
      .setName("dm")
      .setDescription(
        "Whether to send the timeout notification to the user via DM, defaults to true"
      )
      .setRequired(false)
  )
  .addBooleanOption((option) =>
    option
      .setName("ephemeral")
      .setDescription(
        "Whether to make the command response ephemeral, defaults to false"
      )
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers); // only allow those with timeout perms
export async function execute(interaction) {
  const user = interaction.options.getUser("user");
  const duration = interaction.options.getString("duration");
  const reason =
    interaction.options.getString("reason") || "No reason provided";
  const dm = interaction.options.getBoolean("dm") ?? true;
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  // Validate duration format
  if (!/^(\d+[dhms])+$/i.test(duration)) {
    return interaction.editReply({
      content: 'Invalid duration format. Use "1d", "1h30m", or "10s".',
      flags: MessageFlags.Ephemeral,
    });
  }

  // Convert duration to milliseconds
  const timeUnits = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  let totalMilliseconds = 0;
  let currentNumber = "";
  for (const char of duration) {
    if (/\d/.test(char)) {
      currentNumber += char;
    } else if (timeUnits[char]) {
      totalMilliseconds += parseInt(currentNumber, 10) * timeUnits[char];
      currentNumber = "";
    } else {
      return interaction.editReply({
        content: `Invalid time unit "${char}". Use "d", "h", "m", or "s".`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  // check if longer than 28 days, if so, cap it
  if (totalMilliseconds > 2419200000) {
    totalMilliseconds = 2419200000; // 28 days in milliseconds
  }

  if (currentNumber) {
    return interaction.editReply({
      content: "Duration must end with a time unit.",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (!user) {
    return interaction.editReply({
      content: "You must specify a user to timeout.",
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

  // role hiearchy check
  if (
    member.roles.highest.position >=
      interaction.member.roles.highest.position &&
    interaction.guild.ownerId !== interaction.user.id // allow owner to timeout anyone
  ) {
    return interaction.editReply({
      content:
        "You cannot timeout a user with an equal or higher role than yourself.",
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
        "I cannot timeout this user because their role is higher or equal to my highest role.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // self, bot, owner, and mod checks
  if (user.id === interaction.user.id) {
    return interaction.editReply({
      content: "You cannot timeout yourself.",
      flags: MessageFlags.Ephemeral,
    });
  }
  if (user.id === interaction.client.user.id) {
    return interaction.editReply({
      content: "You cannot timeout the bot.",
      flags: MessageFlags.Ephemeral,
    });
  }
  if (user.id === interaction.guild.ownerId) {
    return interaction.editReply({
      content: "You cannot timeout the server owner.",
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
      content: "You cannot timeout a user with moderation permissions.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // all checks pass atp, proceed
  try {
    var couldDm = false;
    if (dm) {
      await user
        .send(
          `You have been timed out in **${interaction.guild.name}** for **${duration}**.\nReason: ${reason}`
        )
        .then(() => {
          couldDm = true;
        })
        .catch(() => {
          console.log(`Could not DM ${user.tag} about the timeout.`);
        });
    }

    // add modlog
    await addModlog(interaction, "Timeout", user, interaction.user, reason);

    var timeoutReason =
      "Timeout by " + interaction.user.tag + " for: " + reason;
    // cut timeoutReason under 512 chars, discord limit
    if (timeoutReason.length > 512) {
      timeoutReason = timeoutReason.substring(0, 512);
    }
    await member.timeout(totalMilliseconds, { reason: timeoutReason });

    // reply to the interaction
    let description = `**${user.tag}** has been timed out for **${duration}** for ${reason}.`;
    if (dm && !couldDm) {
      description += "\n\n*Note: Could not DM the user about this timeout.*";
    }

    // and embed
    const responseEmbed = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("User Timeout")
      .setDescription(description)
      .setTimestamp();

    return interaction.editReply({
      embeds: [responseEmbed],
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  } catch (error) {
    interaction.editReply({
      content: "An error occurred while trying to timeout the user.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
