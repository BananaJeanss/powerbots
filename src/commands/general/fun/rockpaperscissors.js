import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("rockpaperscissors")
  .setDescription("Play a game of rock paper scissors.")
  .addStringOption((option) =>
    option
      .setName("choice")
      .setDescription("Your choice: rock, paper, or scissors")
      .setRequired(true)
      .addChoices(
        { name: "Rock", value: "rock" },
        { name: "Paper", value: "paper" },
        { name: "Scissors", value: "scissors" }
      )
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
  const ephemeral = interaction.options.getBoolean("ephemeral") || false;
  const userChoice = interaction.options.getString("choice").toLowerCase();

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  try {
    const choices = ["rock", "paper", "scissors"];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];

    let result;

    function rpsWaitEmbed(desc) {
      const embed = new EmbedBuilder()
        .setColor("#808080")
        .setTitle("Rock Paper Scissors")
        .setDescription(desc)
        .setTimestamp();
      return embed;
    }

    const waitBetween = 250;
    let waitEmbed = rpsWaitEmbed("Rock!");
    await interaction.editReply({ embeds: [waitEmbed] });
    await new Promise((resolve) => setTimeout(resolve, waitBetween));

    waitEmbed = rpsWaitEmbed("Rock! Paper!");
    await interaction.editReply({ embeds: [waitEmbed] });
    await new Promise((resolve) => setTimeout(resolve, waitBetween));

    waitEmbed = rpsWaitEmbed("Rock! Paper! Scissors!");
    await interaction.editReply({ embeds: [waitEmbed] });
    await new Promise((resolve) => setTimeout(resolve, waitBetween));

    waitEmbed = rpsWaitEmbed("Rock! Paper! Scissors! Shoot!");
    await interaction.editReply({ embeds: [waitEmbed] });
    await new Promise((resolve) => setTimeout(resolve, waitBetween));

    if (userChoice === botChoice) {
      result = "It's a tie!";
    } else if (
      (userChoice === "rock" && botChoice === "scissors") ||
      (userChoice === "paper" && botChoice === "rock") ||
      (userChoice === "scissors" && botChoice === "paper")
    ) {
      result = "You win!";
    } else {
      result = "You lose!";
    }

    const emojiMap = {
      rock: "🪨",
      paper: "📄",
      scissors: "✂️",
    };

    const responseEmbed = new EmbedBuilder()
      .setColor("#808080")
      .setTitle("Rock Paper Scissors")
      .setDescription(
        `${emojiMap[userChoice]} You chose **${userChoice}**\n${emojiMap[botChoice]} I chose **${botChoice}**\n\n${result}`
      )
      .setTimestamp();

    await interaction.editReply({
      embeds: [responseEmbed],
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  } catch (error) {
    console.error("Error occurred while playing Rock Paper Scissors:", error);
    return interaction.editReply({
      content:
        "An error occurred while playing Rock Paper Scissors. Please try again later.",
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }
}
