const Discord = require('discord.js');
const nodeFetch = require('node-fetch');
const { SQL } = require('./sql');

require('dotenv').config();

const client = new Discord.Client();
client.login(process.env.bot_token);

const channelsList = [];
const sentGames = [];

client.on('ready', function (err, token) {
  if (err) {
    console.log(err);
  }
  console.log('Bot online');

  client.user.setActivity('fgHelp', { type: 'LISTENING' });
});

client.on('message', function (msg, err) {
  if (err) {
    console.log(err);
  }

  // Add the channel to list of channels which free games are sent
  if (msg.content === 'fgAdd') {
    channelsList.push(msg.channel.id);
    msg.channel.send('Free game alerts will now be sent to this channel.');
    console.log('Added:', msg.channel.id);
  }

  // Removes the channel to list of channels which free games are sent
  if (msg.content === 'fgRemove') {
    const i = channelsList.indexOf(msg.channel.id);
    if (i !== -1) {
      channelsList.splice(i, 1);
    }
    msg.channel.send('No longer receiving free game alerts here.');
    console.log('Removed:', msg.channel.id);
  }

  // Send free games when users types sendFreeGames, won't send duplicates
  if (msg.content === 'fgSend') {
    sendGames(msg.channel.id);
  }

  if (msg.content === 'fgHelp') {
    helpInfo(msg.channel.id);
  }

  if (msg.content === 'fgActive') {
    if (channelsList.indexOf(msg.channel.id) !== -1) {
      msg.channel.send('Currently receiving free game alerts here');
    } else {
      msg.channel.send('Not receiving free game alerts here');
    }
  }
});

function helpInfo (channelID) {
  const clientChannel = client.channels.cache.get(channelID);

  const embedMsg = new Discord.MessageEmbed()
    .setColor('#0099ff')
    .setTitle('Commands')
    .addFields(
      {
        name: 'fgAdd',
        value: 'Receive free game alerts to current channel',
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
      }
    )
    .setAuthor('Free Games Bot',
      'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
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

  for (let i = 0; i < 60; i++) {
    if (post[i].data.title.includes('free') ||
          post[i].data.title.includes('Free') ||
          post[i].data.title.includes('100%')) {
      if (post[i].data.ups > 200 && post[i].data.thumbnail !== 'spoiler') { // posts with > 200 scores and not expired
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
            'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
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
  if (posts !== 'invalid' && posts !== null) {
    channelsList.forEach(async function (channel) {
      getCurrentGames(channel, posts);
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
