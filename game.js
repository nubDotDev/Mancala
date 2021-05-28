const Board = require("./board.js");
const { HumanAgent } = require("./agent.js");
const Canvas = require("canvas");
const { MessageEmbed, MessageAttachment } = require("discord.js");
const fs = require("fs");

const moveEmojis = { "1️⃣": 1, "2️⃣": 2, "3️⃣": 3, "4️⃣": 4, "5️⃣": 5, "6️⃣": 6 };

let boardImg, marbleImgs;
async function init() {
  Canvas.registerFont("./assets/TheGirlNextDoor-Regular.ttf", { family: "The Girl Next Door" })
  boardImg = await Canvas.loadImage("./assets/Mancala_Board.png");
  marbleImgs = [];
  for (let file of fs.readdirSync("./assets/marbles/")) {
    marbleImgs.push(await Canvas.loadImage("./assets/marbles/" + file));
  }
}
init();

class Game {
  constructor(channel, visual) {
    this.channel = channel;
    this.visual = visual;
    this.board = new Board();
    this.agents = [];

    if (visual) {
      this.canvas = Canvas.createCanvas(2160, 1310);
      this.ctx = this.canvas.getContext("2d");
      this.ctx.textAlign = "center";
      this.ctx.font = "115px The Girl Next Door";
      this.marbles = [];
      for (let i = 0; i < 14; i++) {
        this.marbles.push([]);
        if ((i + 1) % 7 !== 0) {
          for (let j = 0; j < 4; j++) {
            const marble = new Marble(this.ctx);
            marble.place(i);
            this.marbles[i].push(marble);
          }
        }
      }
    }

    this.collectorFun = async (reaction, user) => {
      await reaction.users.remove(user);
      if (this.currentAgent instanceof HumanAgent && this.currentAgent.user.id === user.id) {
        if (reaction.emoji.name in moveEmojis) {
          await this.submitTurn(moveEmojis[reaction.emoji.name]);
        } else if (reaction.emoji.name === "❌") {
          await this.submitTurn(0);
        }
      } else if (reaction.emoji.name === "❌") {
        const other = this.agents[this.board.turn ^ 1];
        if (other instanceof HumanAgent && other.user.id === user.id) {
          this.board.turn ^= 1;
          await this.submitTurn(0);
        }
      }
    }
  }

  get currentAgent() {
    return this.agents[this.board.turn];
  }

  async getEmbed(winner) {
    const embed =  new MessageEmbed()
        .setColor("#5e0cc9")
        .setTitle("Mancala")
        .setDescription(this.agents[0].mention + " vs. " + this.agents[1].mention);
    if (winner === -1) {
      embed.addField("Turn", this.currentAgent.mention);
    } else {
      embed.addField("Winner", winner === 2 ? "Draw" : this.agents[winner].mention);
    }
    if (this.visual) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(this.agents[0].avatar, 955, 1060, 250, 250);
      this.ctx.drawImage(this.agents[1].avatar, 955, 0, 250, 250);
      this.ctx.drawImage(boardImg, 0, 275);
      for (let well of this.marbles) {
        for (let marble of well) {
          marble.draw();
        }
      }
      for (let i = 0; i <= 6; i++) {
        this.ctx.fillText(this.board.wells[i], 430 + 260 * i, 1010);
        this.ctx.fillText(this.board.wells[13 - i], 170 + 260 * i, 365);
      }
      const attachment = new MessageAttachment(this.canvas.toBuffer(), "mancala.png");
      embed
        .attachFiles(attachment)
        .setImage('attachment://mancala.png');
    } else {
      embed.addField("Board", "```\n" + this.board.toStr() + "\n```");
    }
    return embed;
  }

  async setupMsg(winner = -1) {
    if (this.visual) {
      let toMove = [];
      for (let i = 0; i < 14; i++) {
        if (this.board.wells[i] === 0 && this.marbles[i].length > 0) {
          toMove = toMove.concat(this.marbles[i]);
          this.marbles[i] = [];
        }
      }
      for (let i = 0; i < 14; i++) {
        const toPlace = this.board.wells[i] - this.marbles[i].length;
        for (let j = 0; j < toPlace; j++) {
          const marble = toMove.pop();
          marble.place(i);
          this.marbles[i].push(marble);
        }
      }
      if (this.msg) {
        try {
          await this.msg.delete({ timeout: 3000 });
        } catch (err) {
          return;
        }
      }
      const embed = await this.getEmbed(winner);
      this.msg = await this.channel.send(embed);
      if (winner === -1) {
        if (this.currentAgent instanceof HumanAgent) {
          for (let emoji of Object.keys(moveEmojis)) {
            await this.msg.react(emoji);
          }
        }
        await this.msg.react("❌");
        this.collector = this.msg.createReactionCollector(() => true, { time: 600000 });
        this.collector.on("collect", this.collectorFun);
      }
    } else if (this.msg) {
      const embed = await this.getEmbed(winner);
      await this.msg.edit(embed);
    } else {
      const embed = await this.getEmbed(winner);
      this.msg = await this.channel.send(embed);
      for (let emoji of Object.keys(moveEmojis)) {
        await this.msg.react(emoji);
      }
      await this.msg.react("❌");
      this.collector = this.msg.createReactionCollector(() => true, { time: 3600000 });
      this.collector.on("collect", this.collectorFun);
      this.collector.on("end", () => this.msg.reactions.removeAll());
    }
  }

  async start() {
    await this.setupMsg();
    await this.currentAgent.onTurn();
  }

  async submitTurn(well) {
    let winner;
    let update = true;
    if (well === 0) {
      winner = this.board.turn ^ 1;
    } else {
      update = this.board.move(well);
      winner = this.board.checkWin();
    }
    if (update) {
      await this.setupMsg(winner);
      if (winner === -1) {
        await this.currentAgent.onTurn();
      } else {
        this.collector.stop();
      }
    }
  }
}

class Marble {
  constructor(ctx) {
    this.ctx = ctx;
    this.img = marbleImgs[Math.floor(Math.random() * marbleImgs.length)];
    this.x = 0;
    this.y = 0;
  }

  draw() {
    this.ctx.drawImage(this.img, this.x - 40, this.y + 235, 80, 80);
  }

  place(index) {
    if ((index + 1) % 7 === 0) {
      this.x = Math.random() * 170 - 85;
      this.y = Math.random() * (320 + 2 * Math.sqrt(85 * 85 - this.x * this.x)) + 135;
      this.x += (index === 13) ? 165 : 1995;
    } else {
      const theta = Math.random() * 2 * Math.PI;
      const r = Math.sqrt(Math.random()) * 85;
      this.x = Math.cos(theta) * r;
      this.y = Math.sin(theta) * r;
      let wellX;
      if (index > 6) {
        wellX = 13 - index;
        this.y += 220;
      } else {
        wellX = index + 1;
        this.y += 540;
      }
      this.x += 170 + 260 * wellX;
    }
  }
}

module.exports = Game;