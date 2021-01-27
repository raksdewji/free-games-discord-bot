const Discord = require('discord.js');
const nodeFetch = require('node-fetch');
const { SQL } = require('./sql');

require('dotenv').config();

const client = new Discord.Client();
client.login(process.env.bot_token);

const sentGames = [];

client.on('ready', function (err, token) {
  if (err) {
    console.log(err);
  }
  console.log('Bot online');

  // client.user.setActivity('fgHelp', { type: 'LISTENING' });
  client.user.setActivity('dev env', { type: 'LISTENING' });
});

client.on('message', function (msg, err) {
  if (err) {
    console.log(err);
  }

  // Add the channel to list of channels which free games are sent
  if (msg.content === 'fgAdd') {
    addChannel(msg.channel.id);
    msg.channel.send('Free game alerts will now be sent to this channel.');
  }

  // Removes the channel to list of channels which free games are sent
  if (msg.content === 'fgRemove') {
    removeChannel(msg.channel.id);
    msg.channel.send('No longer receiving free game alerts here.');
  }

  // Send free games when users types sendFreeGames, won't send duplicates
  if (msg.content === 'fgSend') {
    sendGames(msg.channel.id);
  }

  if (msg.content === 'fgHelp') {
    helpInfo(msg.channel.id);
  }

  // Check if current channel is receiving free games
  if (msg.content === 'fgActive') {
    checkActive(msg.channel.id);
  }
});

// Check if given channel is getting updates
const checkActive = async (channelID) => {
  const rows = await checkActiveChannel(channelID);
  const clientChannel = client.channels.cache.get(channelID);

  if (rows.length > 0) {
    clientChannel.send('Currently receiving free game alerts here');
  } else {
    clientChannel.send('Not receiving free game alerts here');
  }
};

function helpInfo (channelID) {
  const clientChannel = client.channels.cache.get(channelID);

  const embedMsg = new Discord.MessageEmbed()
    .setColor('#0099ff')
    .setDescription('Simple bot that fetches free games submitted to /r/GameDeals')
    .addFields(
      {
        name: 'fgAdd',
        value: 'Receive free game alerts to this channel',
        inline: true
      },
      {
        name: 'fgRemove',
        value: 'Unsubscribe from free game alerts to this channel',
        inline: true
      },
      {
        name: 'fgActive',
        value: 'Check if current channel is receiving free game alerts',
        inline: true
      },
      {
        name: 'Free Games Bot Info',
        value: `Currently in ${client.guilds.cache.size} servers.
                Have any issues or feature requests? Check out the [Github Repo](https://github.com/raksdewji/free-games-discord-bot#readme) `
      },
      {
        name: 'Add Free Games Bot to another server',
        value: '[Invite Link](https://discord.com/oauth2/authorize?client_id=791791586731884606&scope=bot)'
      }
    )
    .setAuthor('Free Games Bot',
      'https://raw.githubusercontent.com/raksdewji/free-games-discord-bot/master/assets/bot%20icon.png',
      'https://github.com/raksdewji/free-games-discord-bot');

  clientChannel.send(embedMsg);
}

const sendGames = async (channelID) => {
  const posts = await fetchPosts();
  if (posts !== 'invalid' && posts !== null) {
    getCurrentGames(channelID, posts);
  }
};

// Fetch posts from Reddit using node-fetch and return the body
const fetchPosts = async () => {
  const targetURL = 'https://reddit.com/r/gamedeals/new.json?sort=new&t=week&limit=100';

  try {
    const res = await nodeFetch(targetURL);
    const body = await res.json();
    if (!body.data) {
      console.log('No posts found');
      return null;
    } else if (!body.data.children || body.data.children <= 0) {
      console.log('invalid');
      return 'invalid';
    }
    return body;
  } catch (err) {
    console.log(err);
  }
};

const getCurrentGames = async (channel, post) => {
  const clientChannel = client.channels.cache.get(channel);
  post = post.data.children;

  for (let i = 0; i < 50; i++) {
    if (post[i].data.title.includes('free') ||
          post[i].data.title.includes('Free') ||
          post[i].data.title.includes('100%')) {
      if (post[i].data.ups > 300 && post[i].data.thumbnail !== 'spoiler') { // posts with > 300 scores and not expired
        let title = post[i].data.title;
        if (title.length > 256) {
          title = title.substring(0, 256);
        }

        let thumbnail;
        if (post[i].data.thumbnail === 'default') { // no thumbnail from reddit
          thumbnail = 'https://www.reddit.com/static/noimage.png';
        } else {
          thumbnail = post[i].data.thumbnail;
        }

        const embedMsg = new Discord.MessageEmbed()
          .setColor('#0099ff')
          .setTitle(title)
          .setURL(`https://www.reddit.com${post[i].data.permalink}`)
          .setDescription(`Free game here: ${post[i].data.url}`)
          .setAuthor('Free Games Bot',
            'https://raw.githubusercontent.com/raksdewji/free-games-discord-bot/master/assets/bot%20icon.png',
            'https://github.com/raksdewji/free-games-discord-bot')
          .setImage(thumbnail);

        if (sentGames.indexOf(`${post[i].data.permalink}${clientChannel}`) === -1) {
          sentGames.push(`${post[i].data.permalink}${clientChannel}`);
          clientChannel.send(embedMsg);
          console.log('Sent game: ', `${post[i].data.permalink}${clientChannel}`);
        }
      }
    }
  }
};

const fetchGames = async () => {
  const posts = await fetchPosts();
  const channels = await getActiveChannels();

  if (posts !== 'invalid' && posts !== null) {
    channels.forEach(async function (channel) {
      getCurrentGames(channel.channel_id, posts);
    });
  }
};

// Call fetchGames every 1 hour (3600000 milliseconds)
setInterval(function () {
  fetchGames();
  console.log('1 hour timer');

  if (sentGames.length > 1000000) {
    sentGames.splice(0, sentGames.length - 250000); // remove quarter of sent games list
    console.log('cleaned array');
  }
}, 3600000);

// Add channel to Postgres DB
const addChannel = async (channelID) => {
  const channel = channelID;
  const query = `INSERT INTO public.channels VALUES (${channel});`;

  try {
    const { rows } = await SQL(query);
    console.log(`Added: ${channel} to DB`);
    return rows;
  } catch (err) {
    console.log(err);
    return `Failed to add channel ${err.message}`;
  }
};

// Remove channel from DB
const removeChannel = async (channelID) => {
  const channel = channelID;
  const query = `DELETE FROM public.channels WHERE "channel_id"='${channel}';`;

  try {
    const { rows } = await SQL(query);
    console.log(`Removed: ${channel} to DB`);
    return rows;
  } catch (err) {
    console.log(err);
    return `Failed to remove channel ${err.message}`;
  }
};

// Given a channel id, checks the DB to see if the id exits
const checkActiveChannel = async (channelID) => {
  const channel = channelID;
  const query = `SELECT * FROM public.channels WHERE "channel_id"='${channel}';`;

  try {
    const { rows } = await SQL(query);
    if (rows.length > 0) {
      return rows;
    } else {
      return rows;
    }
  } catch (err) {
    console.log(err);
    return `Failed to check if channel is active ${err.message}`;
  }
};

// Get all channels that are receiving game updates
const getActiveChannels = async () => {
  const query = 'SELECT channel_id FROM public.channels;';

  try {
    const { rows } = await SQL(query);
    console.log(rows);
    return rows;
  } catch (err) {
    console.log(err);
    return `Failed to get channel_id rows ${err.message}`;
  }
};
