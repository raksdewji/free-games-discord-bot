const Discord = require('discord.js');
const nodeFetch = require('node-fetch');

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
  }

  // Removes the channel to list of channels which free games are sent
  if (msg.content === 'fgRemove') {
    const i = channelsList.indexOf(msg.channel.id);
    if (i !== -1) {
      channelsList.splice(i, 1);
    }
    msg.channel.send('No longer receiving free game alerts here.');
  }

  // Send free games when users types sendFreeGames
  if (msg.content === 'fgSend') {
    getCurrentGames(msg.channel.id);
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

const getCurrentGames = async (channel) => {
  const clientChannel = client.channels.cache.get(channel);
  const targetURL = 'https://reddit.com/r/gamedeals/hot.json?sort=hot&t=day&limit=100';

  await nodeFetch(targetURL).then(res => res.json()).then(body => {
    let post;

    if (!body.data) {
      console.log('No posts found');
      post = null;
      return post;
    } else if (!body.data.children || body.data.children <= 0) {
      console.log('Invalid');
      post = 'invalid';
      return post;
    }

    post = body.data.children;
    post = post.slice(0, 20); // Get top 20 hot posts

    for (let i = 0; i < 20; i++) {
      if (post[i].data.title.includes('free') ||
            post[i].data.title.includes('Free') ||
            post[i].data.title.includes('100%')) {
        console.log(post[i].data);

        let title = post[i].data.title;
        if (title.length > 256) {
          title = title.substring(0, 256);
        }

        let thumbnail;
        if (post[i]?.data?.thumbnail !== 'spoiler' && post[i]?.data?.thumbnail !== 'default') {
          thumbnail = post[i]?.data?.thumbnail;
        }

        const embedMsg = new Discord.MessageEmbed()
          .setColor('#0099ff')
          .setTitle(title)
          .setURL(`https://www.reddit.com${post[i]?.data?.permalink}`)
          .setDescription(`Free game here: ${post[i]?.data?.url}`)
          .setAuthor('Free Games Bot',
            'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
            'https://github.com/raksdewji/free-games-discord-bot')
          .setImage(thumbnail);

        console.log('Sent game: ', `${post[i]?.data?.permalink}${clientChannel}`);

        if (sentGames.indexOf(`${post[i]?.data?.permalink}${clientChannel}`) === -1) {
          sentGames.push(`${post[i]?.data?.permalink}${clientChannel}`);
          clientChannel.send(embedMsg);
        }
      }
    }
  });
};

const fetchGames = async () => {
  channelsList.forEach(getCurrentGames);
};

// Call fetchGames every 30 min (1800000 milliseconds)
setInterval(function () {
  fetchGames();
  console.log('30 minute timer');

  if (sentGames.length > 100000) {
    sentGames.splice(0, sentGames.length - 50000); // remove half of sent games list
    console.log('cleaned array');
  }
}, 1800000);
