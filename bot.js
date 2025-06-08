const fs = require('fs');
const LOG_CHANNEL_ID = 'process.env._LOG_CHANNEL_ID';
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ]
});

const TOKEN = 'process.env.TOKEN';
const GUILD_ID = 'process.env.LOG_CHANNEL_ID';
const TIME_LIMIT_MS = 8 * 60 * 60 * 1000; // 8 hours

let joinTimes = {};

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
          channel.send(`⛔ **${member.user.tag}** was kicked for having no roles after the timeout.`);
        }
      } catch (err) {
        console.error(`Failed to kick ${member.user.tag}:`, err.message);
      }
    }
  }
}, 2 * 60 * 60 * 1000); // Every 2 hours
client.login(TOKEN);

