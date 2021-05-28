const config = require('dotenv').config()
const Discord = require("discord.js");
const client = new Discord.Client();
const Game = require("./game.js");
const { HumanAgent, MinimaxAgent } = require("./agent.js");
const { loadImage } = require("canvas");

client.on('ready', () => {
  console.log('Mancabot is ready!');
  client.user.setActivity("~mancala help");
});

client.on('message', async msg => {
  if (!msg.content.startsWith("~")) {
    return;
  }
  
  const args = msg.content.toLowerCase().slice(1).split(/ +/);
  const cmd = args.shift().toLowerCase();

  switch (cmd) {
    case "mancala":
      if (args.includes("help")) {
        msg.channel.send(new Discord.MessageEmbed()
            .setColor("#5e0cc9")
            .setTitle("Mancala Help")
            .addFields(
              {
                name: "Command (Hover)",
                value: `~mancala <user / [AI difficulty](${msg.url} "1-9")> [[first/second/random](${msg.url} "When you go")] [[pretty](${msg.url} "Adds visual (slower!)")]`
              },
              { name: "Reactions", value: "1️⃣ - 6️⃣: Select a well with the leftmost well being 1 and the rightmost well being 6\n❌: Forfeit" }
            ));
        return;
      }
      const game = new Game(msg.channel, args.includes("pretty"));
      const mention = msg.mentions.users.first();
      if (mention) {
        game.agents = [new HumanAgent(game, mention), new HumanAgent(game, msg.author)];
        game.agents[0].avatar = await loadImage(game.agents[0].user.avatarURL({ format: "png" }));
        game.agents[1].avatar = await loadImage(game.agents[1].user.avatarURL({ format: "png" }));
        if (args.length >= 2) {
          const order = ["first", "second", "random"].includes(args[1].toLowerCase()) ? args[1].toLowerCase() : "second";
          if (order === "first" || (order === "random" && Math.round(Math.random()))) {
            game.agents.reverse();
          }
        }
        await game.start();
      } else {
        const depth = Math.min(Math.max(parseInt(args[0]) || 5, 1), 9);
        game.agents = [new HumanAgent(game, msg.author), new MinimaxAgent(game, depth)];
        game.agents[0].avatar = await loadImage(game.agents[0].user.avatarURL({ format: "png" }));
        game.agents[1].avatar = await loadImage("./assets/ai.png");
        if (args.length >= 2) {
          const order = ["first", "second", "random"].includes(args[1].toLowerCase()) ? args[1].toLowerCase() : "first";
          if (order === "second" || (order === "random" && Math.round(Math.random()))) {
            game.agents[1].turn = 0;
            game.agents.reverse();
          }
        }
        await game.start();
      }
      break;
  }
});

process.on("uncaughtException", function (err) {
  console.error(err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.log("Unhandled Rejection at", promise, "reason:", reason);
})

client.login(process.env.BOT_TOKEN);