import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlagsBitField,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("serverinfo")
  .setDescription("Fetches information about the current server.")
  // wouldve added id support but bots cannot fetch guilds they are not in :(
  .addBooleanOption((option) =>
    option
      .setName("ephemeral")
      .setDescription(
        "Whether to make the response ephemeral (only visible to you), defaults to false"
      )
      .setRequired(false)
  );
export async function execute(interaction) {
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlagsBitField.Flags.Ephemeral : undefined,
  });

  try {
    // fetch server info
    const server = interaction.guild;

    if (!server) {
      await interaction.editReply({
        content: "Server not found.",
        flags: ephemeral ? MessageFlagsBitField.Flags.Ephemeral : undefined,
      });
      return;
    }

    const fields = [
      {
        name: "Owner",
        value: `<@${server.ownerId}>`,
        inline: true,
      },
      {
        name: "Member Count",
        value: `${server.memberCount}`,
        inline: true,
      },
      {
        name: "Online Members",
        value: `${
          server.members.cache.filter(
            (member) => member.presence?.status === "online"
          ).size
        }`,
        inline: true,
      },
      {
        name: "Bots",
        value: `${
          server.members.cache.filter((member) => member.user.bot).size
        }`,
        inline: true,
      },
      {
        name: "Boost Level",
        value: `${server.premiumTier} (${server.premiumSubscriptionCount} boosts)`,
        inline: true,
      },
      {
        name: "Role Count",
        value: `${server.roles.cache.size}`,
        inline: true,
      },
      {
        name: "Channel Count",
        value: `${server.channels.cache.size}`,
        inline: true,
      },
      {
        name: "Emoji Count",
        value: `${server.emojis.cache.size}`,
        inline: true,
      },
      {
        name: "Sticker Count",
        value: `${server.stickers.cache.size}`,
        inline: true,
      },
      {
        name: "Soundboard Count",
        value: `${server.soundboardSounds.cache.size}`,
        inline: true,
      },
      {
        name: "Created At",
        value: `<t:${Math.floor(server.createdAt.getTime() / 1000)}:F>`,
        inline: false,
      },
      {
        name: "Server ID",
        value: server.id,
        inline: false,
      },
    ];

    // if vanity exists
    if (server.vanityURLCode) {
      fields.push({
        name: "Vanity URL",
        value: `https://discord.gg/${server.vanityURLCode}`,
        inline: false,
      });
    }

    // and embed
    let respEmbed;
    if (server.banner) {
      respEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(`${server.name}`)
        .addFields(fields)
        .setThumbnail(server.iconURL({ size: 128, dynamic: true }) || "")
        .setImage(server.bannerURL({ size: 512, dynamic: true }) || "")
        .setTimestamp();
    } else {
      respEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(`${server.name}`)
        .addFields(fields)
        .setThumbnail(server.iconURL({ size: 128, dynamic: true }) || "")
        .setTimestamp();
    }
    await interaction.editReply({
      embeds: [respEmbed],
      flags: ephemeral ? MessageFlagsBitField.Flags.Ephemeral : undefined,
    });
  } catch (error) {
    console.error("Error fetching server info:", error);
    await interaction.editReply({
      content: "An error occurred while fetching server information.",
      flags: ephemeral ? MessageFlagsBitField.Flags.Ephemeral : undefined,
    });
  }
}
