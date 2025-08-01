import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("roll")
  .setDescription("Rolls a dice")
  .addNumberOption((option) =>
    option
      .setName("sides")
      .setDescription(
        "Number of sides on the dice, maximum of 1000 (default is 6)"
      )
      .setMaxValue(1000)
      .setMinValue(1)
      .setRequired(false)
  )
  .addNumberOption((option) =>
    option
      .setName("wait")
      .setDescription(
        "Time to wait before rolling the dice in seconds, maximum 60s (default is 0)"
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
  const sides = interaction.options.getNumber("sides") || 6;
  const ephemeral = interaction.options.getBoolean("ephemeral") || false;
  const waitTime = interaction.options.getNumber("wait") || 0;

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  try {
    // validate sides
    if (sides < 1 || sides > 1000) {
      return interaction.editReply({
        content: "Please provide a valid number of sides between 1 and 1000.",
        flags: ephemeral ? MessageFlags.Ephemeral : undefined,
      });
    }

    if (sides === 1) {
      const whyEmbed = new EmbedBuilder()
        .setColor("#ffffff")
        .setTitle("D1 Dice Roll")
        .setDescription("Why? You rolled a **1** because D1 always rolls 1.")
        .setTimestamp();
      return interaction.editReply({
        embeds: [whyEmbed],
        flags: ephemeral ? MessageFlags.Ephemeral : undefined,
      });
    }

    // roll the dice
    const result = Math.floor(Math.random() * sides) + 1;

    function rollWaitEmbed(desc) {
      const embed = new EmbedBuilder()
        .setColor("#ffffff")
        .setTitle(`D${sides} Dice Roll`)
        .setDescription(desc)
        .setTimestamp();
      return embed;
    }

    if (waitTime > 0) {
      for (let i = 0; i < waitTime; i++) {
        const waitEmbed = rollWaitEmbed(
          `Rolling the dice! ${waitTime - i} seconds...`
        );
        await interaction.editReply({ embeds: [waitEmbed] });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // response embed
    const respEmbed = new EmbedBuilder()
      .setColor("#ffffff")
      .setTitle(`D${sides} Dice Roll`)
      .setDescription(`🎲 You rolled a **${result}**!`)
      .setTimestamp();

    await interaction.editReply({
      embeds: [respEmbed],
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  } catch (error) {
    console.error("Error executing roll command:", error);
    await interaction.editReply({
      content: "An error occurred while executing the command.",
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
    return;
  }
}
