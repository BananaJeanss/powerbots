import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from "discord.js";
import { addSlowmodeLog } from "#utils/modlogs.js";

export const data = new SlashCommandBuilder()
  .setName("slowmode")
  .setDescription("Sets the slowmode for a channel")
  .addStringOption((option) =>
    option
      .setName("duration")
      .setDescription(
        "Duration of slowmode, e.g. 2h 1s. Set to 0 to disable. Max 21600 seconds (6 hours)."
      )
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("Reason for setting the slowmode")
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
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels); // only allow users with Manage Channels permission
export async function execute(interaction) {
  const duration = interaction.options.getString("duration");
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;
  const reason = interaction.options.getString("reason");

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  // turn string into seconds
  const timeUnits = { d: 86400, h: 3600, m: 60, s: 1 };
  let totalSeconds = 0;
  const regex = /(\d+)\s*([dhms])/g;
  let match;
  while ((match = regex.exec(duration)) !== null) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    totalSeconds += value * timeUnits[unit];
  }
  if (totalSeconds === 0 && duration.trim() !== "0") {
    return interaction.editReply({
      content: "Please provide a valid slowmode duration, e.g. 2h, 1s.",
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }

  try {
    // validate duration
    if (totalSeconds < 0 || totalSeconds > 21600) {
      // max 6 hours, discord limit
      return interaction.editReply({
        content:
          "Please provide a valid slowmode duration between 0 and 21600 seconds.",
        flags: ephemeral ? MessageFlags.Ephemeral : undefined,
      });
    }
    let logReason = `Set by ${interaction.user.tag} for: ${
      reason || "No reason provided"
    }`;

    // make sure logreason is under 512 characters, discord limit
    if (logReason.length > 512) {
      logReason = logReason.slice(0, 512);
    }

    // set slowmode
    await interaction.channel.setRateLimitPerUser(totalSeconds, logReason);

    // log the slowmode change
    await addSlowmodeLog(
      interaction,
      interaction.guildId,
      interaction.user.id,
      interaction.channelId,
      totalSeconds,
      reason || "No reason provided"
    );

    // convert seconds to a human-readable format
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    let formattedDuration = "";
    if (hours > 0) formattedDuration += `${hours}h `;
    if (minutes > 0) formattedDuration += `${minutes}m `;
    if (seconds > 0 || formattedDuration === "")
      formattedDuration += `${seconds}s`;
    let responseContent = `Slowmode set to ${formattedDuration} in this channel.`;
    if (reason) {
      responseContent += `\n\n**Reason:** ${reason}`;
    }

    // and embed
    const respEmbed = new EmbedBuilder()
      .setColor("#9b59b6")
      .setTitle("Slowmode Set")
      .setDescription(responseContent)
      .setTimestamp();
    return interaction.editReply({
      embeds: [respEmbed],
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  } catch (error) {
    console.error("Error setting slowmode:", error);
    return interaction.editReply({
      content:
        "An error occurred while trying to set the slowmode. Please try again later.",
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }
}
