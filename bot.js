const Discord = require('discord.js');
const redditFetch = require('tsumiki-reddit.js');

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
});

client.on('message', function (msg, err) {
  if (err) {
    console.log(err);
  }
  console.log(msg.content);

  if (msg.content === 'test') {
    msg.channel.send('test works');
  }

  if (msg.content === 'fetch') {
    msg.channel.send('fetching');
    fetchGames();
  }

  if (msg.content === 'ping') {
    msg.channel.send('pong');
  }

  if (msg.content === '!addFree') {
    channelsList.push(msg.channel.id);
    msg.channel.send('Free game alerts will now be sent here.');
  }

  if (msg.content === '!removeFree') {
    const i = channelsList.indexOf(msg.channel.id);
    if (i !== -1) {
      channelsList.splice(i, 1);
    }
    msg.channel.send('No longer receiving free game alerts');
  }

  // Send free games when users types !free
  if (msg.content === '!free') {
    getCurrentGames(msg.channel.id);
  }
});

const getCurrentGames = async (channel) => {
  await redditFetch({
    subreddit: 'GameDeals',
    type: 'hot',
    allowNSFW: true,
    allowModPost: true,
    allowCrossPost: true,
    allowAllDomains: true,
    amount: 20
  }).then(post => {
    if (post === null) {
      return console.log('Check your options!\nAnd check if you spelled the subreddit correctly.');
    }

    if (post === 0) {
      return console.log('Could not find any posts to fetch from that subreddit! Try another one!');
    }

    const clientChannel = client.channels.cache.get(channel);

    for (let i = 0; i < 20; i++) {
      if (post[i].data.title.includes('free') ||
          post[i].data.title.includes('Free') ||
          post[i].data.title.includes('100%')) {
        console.log(post[i].data);
        const embedMsg = new Discord.MessageEmbed()
          .setTitle(post[i].data.title)
          .setURL(`https://www.reddit.com${post[i]?.data?.permalink}`)
          .setColor('#0099ff')
          .setDescription(`Free game here: ${post[i]?.data?.url}`);

        if (post[i]?.data?.thumbnail !== 'spoiler' && post[i]?.data?.thumbnail !== 'default') {
          embedMsg.setImage(`${post[i]?.data?.thumbnail}`);
        }
        console.log(`${post[i]?.data?.permalink}${clientChannel}`);
        if (sentGames.indexOf(`${post[i]?.data?.permalink}${clientChannel}`) === -1) {
          sentGames.push(`${post[i]?.data?.permalink}${clientChannel}`);
          clientChannel.send(embedMsg);
        }
      }
    }
  }).catch((err) => {
    console.log('error caught: ', err);
  });
};

const fetchGames = async () => {
  channelsList.forEach(getCurrentGames);
};

// Call fetchGames every 30 min (1800000)
setInterval(function () {
  fetchGames();
  console.log('30 minute timer');
  sentGames.splice(0, sentGames.length - 1000); // length of sent games array under 1000
}, 1800000);
