const Discord = require('discord.js');
const redditFetch = require('tsumiki-reddit.js');

require('dotenv').config();

const client = new Discord.Client();
client.login(process.env.bot_token);

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

  if (msg.content === 'test' && msg.channel.id === '791793487318220808') {
    msg.reply('test works');
  }

  if (msg.content === 'ping' && msg.channel.id === '791793487318220808') {
    msg.channel.send('pong');
  }

  // Send free games when users types !user
  if (msg.content === '!free') {
    fetchFreeGames();
  }
});

async function fetchFreeGames() {
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

    const channel = client.channels.cache.get('791793487318220808');

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
        channel.send(embedMsg);
      }
    }
  }).catch((err) => {
    console.log('error caught: ', err);
  });
};

// setTimeout(function() {
//   fetchHotPosts();
// }, 1000);
