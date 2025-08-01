import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("coinflip")
  .setDescription("Flips a coin.")
  .addNumberOption((option) =>
    option
      .setName("wait")
      .setDescription(
        "Time to wait before flipping the coin in seconds, maximum 60s (default is 0)"
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
  );
export async function execute(interaction) {
  const waitTime = interaction.options.getNumber("wait") || 0;
  const ephemeral = interaction.options.getBoolean("ephemeral") || false;

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  try {
    // max wait of 60 seconds
    if (waitTime < 0 || waitTime > 60) {
      return interaction.editReply({
        content: "Please provide a valid wait time between 0 and 60 seconds.",
      });
    }
    // flip the coin
    if (waitTime > 0) {
      for (let i = 0; i < waitTime; i++) {
        const waitEmbed = new EmbedBuilder()
          .setColor("#ffd700")
          .setTitle("🪙 Coin Flip")
          .setDescription(`Flipping the coin! ${waitTime - i} seconds...`)
          .setTimestamp();
        await interaction.editReply({
          embeds: [waitEmbed],
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      const result = Math.random() < 0.5 ? "heads" : "tails";
      const respEmbed = new EmbedBuilder()
        .setColor(result === "heads" ? "#ffa500" : "#8b0000")
        .setTitle("🪙 Coin Flip")
        .setDescription(`The coin landed on **${result}**!`)
        .setTimestamp();
      await interaction.editReply({
        embeds: [respEmbed],
      });
    } else {
      const result = Math.random() < 0.5 ? "heads" : "tails";
      const respEmbed = new EmbedBuilder()
        .setColor(result === "heads" ? "#ffa500" : "#8b0000")
        .setTitle("🪙 Coin Flip")
        .setDescription(`The coin landed on **${result}**!`)
        .setTimestamp();
      await interaction.editReply({
        embeds: [respEmbed],
      });
    }
  } catch (error) {
    console.error("Error flipping coin:", error);
    await interaction.editReply({
      content:
        "An error occurred while flipping the coin. Please try again later.",
    });
  }
}
