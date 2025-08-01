import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { Filter } from "bad-words";

export const data = new SlashCommandBuilder()
  .setName("8ball")
  .setDescription(
    "Ask the magic 8-ball a question, and your fate will be revealed."
  )
  .addStringOption((option) =>
    option
      .setName("question")
      .setDescription("The question to ask the magic 8-ball")
      .setRequired(true)
  );
export async function execute(interaction) {
  let question = interaction.options.getString("question");
  const filter = new Filter();

  // defer reply
  await interaction.deferReply();

  const responses = [
    // from https://magic-8ball.com/magic-8-ball-answers/
    "It is certain",
    "It is decidedly so",
    "Without a doubt",
    "Yes definitely",
    "You may rely on it",
    "As I see it, yes",
    "Most likely",
    "Outlook good",
    "Yes",
    "Signs point to yes",
    "Reply hazy, try again",
    "Ask again later",
    "Better not tell you now",
    "Cannot predict now",
    "Concentrate and ask again",
    "Don`t count on it",
    "My reply is no",
    "My sources say no",
    "Outlook not so good",
    "Very doubtful",
  ];
  const response = responses[Math.floor(Math.random() * responses.length)];

  if (filter.isProfane(question)) {
    question = filter.clean(question);
    // escape asterisks to prevent markdown issues
    question = question.replace(/\*/g, "\\*");
  }

  let descResp = "**Question:** " + question + "\n**Answer:** " + response;

  const embed = new EmbedBuilder()
    .setColor("#000000")
    .setTitle("🎱 Magic 8-Ball")
    .setDescription(descResp)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
