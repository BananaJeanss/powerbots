import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from "discord.js";
import { addPurgeLog } from "#utils/modlogs.js";

export const data = new SlashCommandBuilder()
  .setName("purge")
  .setDescription("Purges a specified number of messages from the channel")
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("The number of messages to purge")
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("The reason for purging messages (optional)")
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
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages); // only allow those with manage messages perms
export async function execute(interaction) {
  const amount = interaction.options.getInteger("amount");
  const reason =
    interaction.options.getString("reason") || "No reason provided";
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

  function purgeEmbedBuilder(title, description, color) {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();
  }

  try {
    // defer reply
    await interaction.deferReply();

    // fetch the reply message to get its ID
    let replyMessageId = null;
    try {
      const replyMsg = await interaction.fetchReply();
      replyMessageId = replyMsg.id;
    } catch (e) {
      // don't filter by replyMessageId if fetch fails
    }

    // fetch messages to delete
    const fetchedMessages = await interaction.channel.messages.fetch({
      limit: amount + 1,
    });
    if (fetchedMessages.size === 0) {
      return interaction.editReply({
        content: "No messages found to delete.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // filter out messages older than 14 days, discord limits
    const now = Date.now();
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    // exclude the bot's reply message from deletion
    const messages = fetchedMessages.filter(
      (msg) =>
        now - msg.createdTimestamp < fourteenDays &&
        msg.id !== interaction.id && // exclude interaction id
        msg.id !== replyMessageId // exclude deferred reply
    );

    if (messages.size === 0) {
      return interaction.editReply({
        content: "No messages found within the last 14 days to delete.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // and delete messages
    await interaction.channel.bulkDelete(messages, true).catch((error) => {
      console.error("Error deleting messages:", error);
      return interaction.editReply({
        content: "An error occurred while trying to delete messages.",
        flags: MessageFlags.Ephemeral,
      });
    });

    // add to purgelog
    await addPurgeLog(
      interaction,
      interaction.guildId,
      interaction.user.id,
      interaction.channel.id,
      messages.size,
      reason
    );

    // and embed
    let embedDescription = `Successfully purged ${messages.size} messages.`;
    if (reason) {
      embedDescription += `\n*Reason:* ${reason}`;
    }
    const responseEmbed = purgeEmbedBuilder(
      "Messages Purged",
      embedDescription,
      "#57F287"
    );

    return interaction.editReply({
      embeds: [responseEmbed],
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  } catch (error) {
    console.error("Error in purge command:", error);
    return interaction.editReply({
      content: "There was an error trying to purge messages.",
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }
}
