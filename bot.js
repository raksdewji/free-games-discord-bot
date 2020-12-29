const Discord = require('discord.js');
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
});
