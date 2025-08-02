import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("dictionary")
  .setDescription("Get definitions for a word from the dictionary")
  .addStringOption((option) =>
    option
      .setName("word")
      .setDescription("The word to define")
      .setRequired(true)
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
  const word = interaction.options.getString("word").trim();
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
        word
      )}`
    );
    if (!response.ok) {
      return interaction.editReply({
        content: `No definitions found for: ${word}`,
        flags: ephemeral ? MessageFlags.Ephemeral : undefined,
      });
    }
    const data = await response.json();

    // and embed
    const fields = [];
    for (const meaning of data[0].meanings) {
      const definitions = meaning.definitions
        .map((def, index) => {
          return `${index + 1}. ${def.definition}${
            def.example ? `\n*Example: ${def.example}*` : ""
          }`;
        })
        .join("\n");

      fields.push({
        name:
          meaning.partOfSpeech.charAt(0).toUpperCase() +
          meaning.partOfSpeech.slice(1),
        value: definitions || "No definitions available",
        inline: false,
      });
    }
    const respEmbed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(word)
      .setThumbnail("https://cdn-icons-png.flaticon.com/512/5347/5347030.png")
      .setDescription(
        `Origin: ${data[0].origin || "Unknown"}\nPhonetic: ${
          data[0].phonetic || "N/A"
        }`
      )
      .addFields(fields)
      .setFooter({ text: `dictionaryapi.dev` })
      .setTimestamp();

    await interaction.editReply({
      embeds: [respEmbed],
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  } catch (error) {
    console.error("Error fetching definition:", error);
    await interaction.editReply({
      content:
        "There was an error fetching the definition. Please try again later.",
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }
}
