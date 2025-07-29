import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlagsBitField,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("whois")
  .setDescription(
    "Fetches public information about a user. Defaults to you if no user is specified."
  )
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("The user to fetch information about")
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("id")
      .setDescription("The ID of the user to fetch information about")
      .setRequired(false)
  )
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
  let user = interaction.options.getUser("user") || interaction.user;
  const userId = interaction.options.getString("id");

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlagsBitField.Flags.Ephemeral : undefined,
  });

  try {
    // ensure userId is a valid ID if provided
    if (userId && !/^\d+$/.test(userId)) {
      return interaction.editReply({
        content: "Invalid user ID format. Please provide a valid numeric ID.",
        flags: ephemeral ? MessageFlagsBitField.Flags.Ephemeral : undefined,
      });
    }
    // if a user ID is provided, fetch the user by ID
    if (userId) {
      try {
        const fetchedUser = await interaction.client.users.fetch(userId);
        if (fetchedUser) {
          user = fetchedUser;
        } else {
          return interaction.reply({
            content: "User not found.",
            flags: ephemeral ? MessageFlagsBitField.Flags.Ephemeral : undefined,
          });
        }
      } catch (error) {
        return interaction.reply({
          content: "Invalid user ID provided.",
          flags: ephemeral ? MessageFlagsBitField.Flags.Ephemeral : undefined,
        });
      }
    }

    // response
    const displayName = user.displayName || user.username;
    const accentColor = user.accentColor || "#0099ff";

    // fetch banner if available
    let bannerUrl = null;
    if (user.banner) {
      bannerUrl = user.bannerURL({ size: 512 });
    }

    // and embed
    const respEmbed = new EmbedBuilder()
      .setColor(accentColor)
      .setTitle(`${user.tag} (${displayName})`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "ID", value: user.id, inline: true },
        {
          name: "Created At",
          value: new Date(user.createdTimestamp).toLocaleString(),
          inline: true,
        },
        {
          name: "Bot",
          value: user.bot ? "Yes" : "No",
          inline: true,
        },
        {
          name: "Badges",
          value: user.flags
            ? user.flags.toArray().join(", ") || "None"
            : "None",
          inline: true,
        }
      )
      .setImage(bannerUrl)
      .setTimestamp();

    await interaction.editReply({
      embeds: [respEmbed],
      flags: ephemeral ? MessageFlagsBitField.Flags.Ephemeral : undefined,
    });
  } catch (error) {
    console.error(error);
    return interaction.editReply({
      content: "There was an error processing your request.",
      flags: ephemeral ? MessageFlagsBitField.Flags.Ephemeral : undefined,
    });
  }
}
