import { EmbedBuilder } from "discord.js";

// build embed for logging
const buildLogEmbed = (
  userPfp,
  username,
  commandName,
  timestamp,
  color,
  moderatorTag,
  reason,
  caseId
) => {
  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: username,
      iconURL: userPfp,
    })
    .setTitle(`Case #${caseId} | ${commandName}`)
    .addFields(
      { name: "User", value: username, inline: true },
      { name: "Moderator", value: moderatorTag, inline: true },
      { name: "Reason", value: reason || "No reason provided", inline: false }
    )
    .setTimestamp(timestamp);
};

export async function addModlog(
  interaction,
  commandName,
  targetUser,
  moderatorUser,
  reason
) {
  const userPfp = targetUser.displayAvatarURL();
  const username = targetUser.tag;
  const moderatorTag = moderatorUser.tag;
  const timestamp = new Date();

  const db = interaction.client.db;

  // get latest modlog id from all collections
  const latestUserModlog = await db
    .collection("userModlogs")
    .find({ guild_id: interaction.guildId })
    .sort({ id: -1 })
    .limit(1)
    .toArray();
  const latestPurgeLog = await db
    .collection("purgeLogs")
    .find({ guild_id: interaction.guildId })
    .sort({ id: -1 })
    .limit(1)
    .toArray();
  const latestSlowmodeLog = await db
    .collection("slowmodeLogs")
    .find({ guild_id: interaction.guildId })
    .sort({ id: -1 })
    .limit(1)
    .toArray();

  const latestIdUser = latestUserModlog.length > 0 ? latestUserModlog[0].id : 0;
  const latestIdPurge = latestPurgeLog.length > 0 ? latestPurgeLog[0].id : 0;
  const latestIdSlowmode = latestSlowmodeLog.length > 0 ? latestSlowmodeLog[0].id : 0;
  const nextId = Math.max(latestIdUser, latestIdPurge, latestIdSlowmode) + 1;

  // add modlog to db
  await db.collection("userModlogs").insertOne({
    guild_id: interaction.guildId,
    user_id: targetUser.id,
    moderator_id: moderatorUser.id,
    action: commandName,
    timestamp: timestamp,
    id: nextId,
    reason: reason,
  });

  // build the embed
  const logEmbed = buildLogEmbed(
    userPfp,
    username,
    commandName,
    timestamp,
    "#3498db",
    moderatorTag,
    reason,
    nextId
  );

  // send the embed to the modlogs channel
  const settings = await db
    .collection("guildModLogs")
    .findOne({ guild_id: interaction.guildId });
  const modlogsChannelId = settings ? settings.modlog_channel : null;
  if (!modlogsChannelId) {
    console.error("Modlogs channel not set for this guild.");
    return;
  }
  const modlogsChannel = interaction.guild.channels.cache.get(modlogsChannelId);
  if (!modlogsChannel || !modlogsChannel.isTextBased()) {
    console.error("Modlogs channel not found or not a text channel.");
    return;
  }
  await modlogsChannel.send({ embeds: [logEmbed] });
}

export async function modifyModlogReason(interaction, modlogId, newReason) {
  const db = interaction.client.db;

  // make sure modlogId is number, convert if not
  if (typeof modlogId !== "number") {
    modlogId = parseInt(modlogId, 10);
    if (isNaN(modlogId)) {
      console.error("Invalid modlog ID provided.");
      return false;
    }
  }

  // update the reason in the db
  await db
    .collection("userModlogs")
    .updateOne({ id: modlogId }, { $set: { reason: newReason } });

  // fetch the updated modlog entry
  const modlog = await db.collection("userModlogs").findOne({ id: modlogId });

  if (!modlog) {
    console.error("Modlog not found.");
    return false;
  }

  // send the embed to the modlogs channel
  const settings = await db
    .collection("guildModLogs")
    .findOne({ guild_id: interaction.guildId });
  const modlogsChannelId = settings ? settings.modlog_channel : null;
  if (!modlogsChannelId) {
    console.error("Modlogs channel not set for this guild.");
    return false;
  }
  const modlogsChannel = interaction.guild.channels.cache.get(modlogsChannelId);
  if (!modlogsChannel || !modlogsChannel.isTextBased()) {
    console.error("Modlogs channel not found or not a text channel.");
    return false;
  }

  // fetch user and moderator tags
  const user = await interaction.client.users
    .fetch(modlog.user_id)
    .catch(() => null);
  const moderator = await interaction.client.users
    .fetch(modlog.moderator_id)
    .catch(() => null);

  const logEmbed = buildLogEmbed(
    user ? user.displayAvatarURL() : null,
    user ? user.tag : "Unknown User",
    `Modlog Reason Updated`,
    new Date(),
    "#f1c40f",
    moderator ? moderator.tag : "Unknown Moderator",
    newReason,
    modlogId
  );
  await modlogsChannel.send({ embeds: [logEmbed] });

  return true;
}

export async function deleteModlog(interaction, modlogId, reason) {
  const db = interaction.client.db;

  // fetch the modlogs channel id from db
  const settings = await db
    .collection("guildModLogs")
    .findOne({ guild_id: interaction.guildId });
  const modlogsChannelId = settings ? settings.modlog_channel : null;
  if (!modlogsChannelId) {
    console.error("Modlogs channel not set for this guild.");
    return;
  }
  const modlogsChannel = interaction.guild.channels.cache.get(modlogsChannelId);
  if (!modlogsChannel || !modlogsChannel.isTextBased()) {
    console.error("Modlogs channel not found or not a text channel.");
    return;
  }

  // fetch the log before deleting
  const deletedLog = await db
    .collection("userModlogs")
    .findOne({ id: modlogId });
  if (!deletedLog) {
    console.error("Deleted modlog not found.");
    return;
  }
  const user = await interaction.client.users.fetch(deletedLog.user_id);
  const username = user.tag;
  const userPfp = user.displayAvatarURL();
  const logEmbed = buildLogEmbed(
    userPfp,
    username,
    deletedLog.action + " (Deleted)",
    deletedLog.timestamp,
    "#e74c3c",
    interaction.user.tag,
    reason,
    deletedLog.id
  );
  await modlogsChannel.send({ embeds: [logEmbed] });

  // and then delete the modlog from the db
  try {
    await db.collection("userModlogs").deleteOne({ id: modlogId });
  } catch (error) {
    console.error("Error deleting modlog:", error);
  }
}

export async function getModlogs(db, guildId) {
  // get modlogs
  const modlogs = await db
    .collection("userModlogs")
    .find({ guild_id: guildId })
    .sort({ timestamp: -1 })
    .toArray();

  // and return modlogs
  return modlogs.map((log) => ({
    id: log.id,
    userId: log.user_id,
    moderatorId: log.moderator_id,
    action: log.action,
    channel: log.channel,
    timestamp: log.timestamp,
    reason: log.reason || null,
  }));
}

export async function getUserModlogs(db, guildId, userId) {
  // get user modlogs
  const userModlogs = await db
    .collection("userModlogs")
    .find({ guild_id: guildId, user_id: userId })
    .sort({ timestamp: -1 })
    .toArray();

  // and return modlogs
  return userModlogs.map((log) => ({
    id: log.id,
    userId: log.user_id,
    moderatorId: log.moderator_id,
    action: log.action,
    channel: log.channel,
    timestamp: log.timestamp,
    reason: log.reason || null,
  }));
}

export async function getUserWarns(db, guildId, userId) {
  // get user warnings
  const userWarns = await db
    .collection("userModlogs")
    .find({ guild_id: guildId, user_id: userId, action: "Warning" })
    .sort({ timestamp: -1 })
    .toArray();

  // and return warnings
  return userWarns.map((warn) => ({
    id: warn.id,
    userId: warn.user_id,
    moderatorId: warn.moderator_id,
    reason: warn.reason || null,
    timestamp: warn.timestamp,
  }));
}

export async function modifyUserNotes(interaction, userId, notes) {
  const db = interaction.client.db;
  const guildId = interaction.guildId;
  const moderatorId = interaction.user.id;
  let caseId;
  try {
    await db
      .collection("userModlogs")
      .updateOne(
        { guild_id: guildId, user_id: userId },
        { $set: { notes: notes } },
        { upsert: true }
      );

    // add case to modlogs
    const latestLog = await db
      .collection("userModlogs")
      .find({ guild_id: guildId })
      .sort({ id: -1 })
      .limit(1)
      .toArray();
    const nextId = latestLog.length > 0 ? latestLog[0].id + 1 : 1;
    caseId = nextId;

    await db.collection("userModlogs").insertOne({
      guild_id: guildId,
      user_id: userId,
      moderator_id: moderatorId,
      action: "Notes Modified",
      timestamp: new Date(),
      id: nextId,
      reason: notes,
    });

    // fetch user and moderator
    const discordUser = await interaction.client.users
      .fetch(userId)
      .catch(() => null);
    const userPfp = discordUser ? discordUser.displayAvatarURL() : null;
    const username = discordUser ? discordUser.tag : "Unknown User";
    const moderatorUser = await interaction.client.users
      .fetch(moderatorId)
      .catch(() => null);
    const moderatorTag = moderatorUser
      ? moderatorUser.tag
      : "Unknown Moderator";

    // fetch modlogs channel id from db
    const settings = await db
      .collection("guildModLogs")
      .findOne({ guild_id: guildId });
    const modlogsChannelId = settings ? settings.modlog_channel : null;
    if (!modlogsChannelId) {
      console.error("Modlogs channel not set for this guild.");
      return false;
    }

    // and embed
    const logEmbed = buildLogEmbed(
      userPfp,
      username,
      "Notes Modified",
      new Date(),
      "#9b59b6",
      moderatorTag,
      notes,
      caseId
    );

    const modlogsChannel =
      interaction.guild.channels.cache.get(modlogsChannelId);
    if (modlogsChannel) {
      await modlogsChannel.send({ embeds: [logEmbed] });
    }
    return true;
  } catch (error) {
    console.error("Error creating log embed:", error);
    return false;
  }
}

export async function getUserNotes(db, guildId, userId) {
  // get user notes
  const userNotes = await db
    .collection("userModlogs")
    .findOne({ guild_id: guildId, user_id: userId, notes: { $exists: true } });

  // return notes if they exist
  if (userNotes && userNotes.notes) {
    return userNotes.notes;
  } else {
    return null;
  }
}

export async function findLogByCase(db, guildId, caseNumber) {
  // find log by case number
  const log = await db
    .collection("userModlogs")
    .findOne({ guild_id: guildId, id: caseNumber });
  return log;
}

export async function addPurgeLog(
  interaction,
  guildId,
  moderatorId,
  channelId,
  amount,
  reason
) {
  const db = interaction.client.db;
  // get latest modlog id from both collections
  const latestUserModlog = await db
    .collection("userModlogs")
    .find({ guild_id: guildId })
    .sort({ id: -1 })
    .limit(1)
    .toArray();
  const latestPurgeLog = await db
    .collection("purgeLogs")
    .find({ guild_id: guildId })
    .sort({ id: -1 })
    .limit(1)
    .toArray();

  const latestIdUser = latestUserModlog.length > 0 ? latestUserModlog[0].id : 0;
  const latestIdPurge = latestPurgeLog.length > 0 ? latestPurgeLog[0].id : 0;
  const nextId = Math.max(latestIdUser, latestIdPurge) + 1;

  // add purge log to db
  await db.collection("purgeLogs").insertOne({
    guild_id: guildId,
    moderator_id: moderatorId,
    channel_id: channelId,
    amount: amount,
    timestamp: new Date(),
    id: nextId,
    reason: reason,
  });

  // and send to modlogs channel
  const settings = await db
    .collection("guildModLogs")
    .findOne({ guild_id: guildId });
  const modlogsChannelId = settings ? settings.modlog_channel : null;
  if (!modlogsChannelId) {
    console.error("Modlogs channel not set for this guild.");
    return;
  }
  const modlogsChannel = interaction.guild.channels.cache.get(modlogsChannelId);
  if (!modlogsChannel || !modlogsChannel.isTextBased()) {
    console.error("Modlogs channel not found or not a text channel.");
    return;
  }
  const moderator = await interaction.client.users
    .fetch(moderatorId)
    .catch(() => null);
  const logEmbed = new EmbedBuilder()
    .setColor("#95a5a6")
    .setTitle(`Case #${nextId} | Purge`)
    .addFields(
      {
        name: "Moderator",
        value: moderator ? moderator.tag : "Unknown",
        inline: true,
      },
      { name: "Channel", value: `<#${channelId}>`, inline: true },
      { name: "Amount", value: `${amount} messages`, inline: true },
      { name: "Reason", value: reason || "No reason provided", inline: true }
    )
    .setTimestamp(new Date());
  await modlogsChannel.send({ embeds: [logEmbed] });
}

export async function addSlowmodeLog(
  interaction,
  guildId,
  moderatorId,
  channelId,
  duration,
  reason
) {
  const db = interaction.client.db;
  // get latest modlog id from both collections
  const latestUserModlog = await db
    .collection("userModlogs")
    .find({ guild_id: guildId })
    .sort({ id: -1 })
    .limit(1)
    .toArray();
  const latestSlowmodeLog = await db
    .collection("slowmodeLogs")
    .find({ guild_id: guildId })
    .sort({ id: -1 })
    .limit(1)
    .toArray();

  const latestIdUser = latestUserModlog.length > 0 ? latestUserModlog[0].id : 0;
  const latestIdSlowmode =
    latestSlowmodeLog.length > 0 ? latestSlowmodeLog[0].id : 0;
  const nextId = Math.max(latestIdUser, latestIdSlowmode) + 1;

  // add slowmode log to db
  await db.collection("slowmodeLogs").insertOne({
    guild_id: guildId,
    moderator_id: moderatorId,
    channel_id: channelId,
    duration: duration,
    timestamp: new Date(),
    id: nextId,
    reason: reason,
  });

  // and send to modlogs channel
  const settings = await db
    .collection("guildModLogs")
    .findOne({ guild_id: guildId });
  const modlogsChannelId = settings ? settings.modlog_channel : null;
  if (!modlogsChannelId) {
    console.error("Modlogs channel not set for this guild.");
    return;
  }
  const modlogsChannel = interaction.guild.channels.cache.get(modlogsChannelId);
  if (!modlogsChannel || !modlogsChannel.isTextBased()) {
    console.error("Modlogs channel not found or not a text channel.");
    return;
  }
  const moderator = await interaction.client.users
    .fetch(moderatorId)
    .catch(() => null);

  // convert seconds to human readable format
  if (parseInt(duration, 10) === 0) {
    var convertedDuration = "Disabled";
  } else {
    var convertedDuration = (() => {
      const seconds = parseInt(duration, 10);
      if (isNaN(seconds)) return "Invalid duration";

      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      return [
        days > 0 ? `${days}d` : "",
        hours > 0 ? `${hours}h` : "",
        minutes > 0 ? `${minutes}m` : "",
        secs > 0 ? `${secs}s` : "",
      ]
        .filter(Boolean)
        .join(" ");
    })();
  }

  // build the log embed
  const logEmbed = new EmbedBuilder()
    .setColor("#9b59b6")
    .setTitle(`Case #${nextId} | Slowmode`)
    .addFields(
      {
        name: "Moderator",
        value: moderator ? moderator.tag : "Unknown",
        inline: true,
      },
      { name: "Channel", value: `<#${channelId}>`, inline: true },
      { name: "Duration", value: `${convertedDuration}`, inline: true },
      { name: "Reason", value: reason || "No reason provided", inline: true }
    )
    .setTimestamp(new Date());
  await modlogsChannel.send({ embeds: [logEmbed] });
}
