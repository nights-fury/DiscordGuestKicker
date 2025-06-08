const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');

// Load from environment
const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

const TIME_LIMIT_MINUTES = parseInt(process.env.TIME_LIMIT_MINUTES || '480'); // default 8 hours
const CHECK_INTERVAL_MINUTES = parseInt(process.env.CHECK_INTERVAL_MINUTES || '120'); // default 2 hours

const TIME_LIMIT_MS = TIME_LIMIT_MINUTES * 60 * 1000;
const CHECK_INTERVAL_MS = CHECK_INTERVAL_MINUTES * 60 * 1000;

let joinTimes = {};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ]
});

function loadJoinTimes() {
  if (fs.existsSync('./data.json')) {
    joinTimes = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
  }
}

function saveJoinTimes() {
  fs.writeFileSync('./data.json', JSON.stringify(joinTimes, null, 2));
}

client.on('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📌 GUILD_ID: ${GUILD_ID}`);
  console.log(`📌 LOG_CHANNEL_ID: ${LOG_CHANNEL_ID}`);
  console.log(`🕒 TIME_LIMIT: ${TIME_LIMIT_MINUTES} minutes`);
  console.log(`🔁 CHECK_INTERVAL: ${CHECK_INTERVAL_MINUTES} minutes`);
  loadJoinTimes();
});

client.on('guildMemberAdd', member => {
  if (member.guild.id === GUILD_ID) {
    joinTimes[member.id] = Date.now();
    saveJoinTimes();
  }
});

setInterval(async () => {
  const guild = await client.guilds.fetch(GUILD_ID);
  const members = await guild.members.fetch();
  const channel = guild.channels.cache.get(LOG_CHANNEL_ID);

  for (const member of members.values()) {
    const joinTime = joinTimes[member.id];
    if (!joinTime) continue;

    const timeSinceJoin = Date.now() - joinTime;
    const hasExtraRoles = member.roles.cache.filter(role => role.name !== '@everyone').size > 0;

    if (timeSinceJoin > TIME_LIMIT_MS && !hasExtraRoles) {
      try {
        await member.kick('No roles after timeout');
        delete joinTimes[member.id];
        saveJoinTimes();

        console.log(`⛔ Kicked ${member.user.tag}`);

        if (channel && channel.isTextBased()) {
          channel.send(`⛔ **${member.user.tag}** was kicked for having no roles after ${TIME_LIMIT_MINUTES} minutes.`);
        }
      } catch (err) {
        console.error(`Failed to kick ${member.user.tag}:`, err.message);
      }
    }
  }
}, CHECK_INTERVAL_MS);

client.login(TOKEN);
