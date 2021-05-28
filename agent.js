const { loadImage } = require("canvas");
const Board = require("./board.js");

class Agent {
  constructor(game) {
    this.game = game;
  }

  async onTurn() {}
}

class HumanAgent extends Agent {
  constructor(game, user) {
    super(game);
    this.user = user;
    this.mention = "<@" + user.id + ">";
  }
}

class MinimaxAgent extends Agent {
  constructor(game, depth, turn = 1) {
    super(game);
    this.depth = depth;
    this.turn = turn;
    this.mention = "CPU" + depth;
    this.moves = [1, 2, 3, 4, 5, 6];
    if (this.turn === 0) {
      this.moves.reverse();
    }
  }

  alphaBeta(node, depth, alpha, beta) {
    const win = node.checkWin();
    if (depth === 0 || (0 <= win && win <= 2)) {
      switch (win) {
        case -1:
          return [[], (this.turn * 2 - 1) * (node.wells[13] - node.wells[6])];
        case 0:
        case 1:
          return [[], this.turn === win ? 48 : -48];
        case 2:
          return [[], 0];
      }
    }
    if (this.turn === node.turn) {
      let best;
      let value = -Infinity;
      for (let i of this.moves) {
        const child = new Board([...node.wells], node.turn);
        if (child.move(i)) {
          const childValue = this.alphaBeta(child, depth - 1, alpha, beta)[1];
          if (childValue > value) {
            best = i;
            value = childValue;
            alpha = Math.max(alpha, value);
            if (alpha >= beta) {
              break;
            }
          }
        }
      }
      return [best, value];
    } else {
      let best;
      let value = Infinity;
      for (let i of this.moves) {
        const child = new Board([...node.wells], node.turn);
        if (child.move(i)) {
          const childValue = this.alphaBeta(child, depth - 1, alpha, beta)[1];
          if (childValue < value) {
            best = i;
            value = childValue;
            beta = Math.min(beta, value);
            if (beta <= alpha) {
              break;
            }
          }
        }
      }
      return [best, value];
    }
  }

  async onTurn() {
    const move = this.alphaBeta(this.game.board, this.depth, -Infinity, Infinity)[0];
    await this.game.submitTurn(move);
  }
}

module.exports = { HumanAgent, MinimaxAgent };