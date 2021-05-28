class Board {
  constructor(wells=[4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0], turn=0) {
    this.wells = wells;
    this.turn = turn;
  }

  checkWin() {
    if (this.wells[6] === 24 && this.wells[13] === 24) {
      return 2;
    } else if (this.wells[13] > 24) {
      return 1;
    } else if (this.wells[6] > 24) {
      return 0;
    }
    return -1;
  }

  move(well) {
    let home, enemy, index;
    if (this.turn === 0) {
      home = 6;
      enemy = 13;
      index = well - 1
    } else {
      home = 13;
      enemy = 6;
      index = 13 - well;
    }
    let marbles = this.wells[index]
    if (marbles === 0) {
      return false;
    }
    this.wells[index] = 0;
    while (marbles > 0) {
      index = (index + 1) % 14;
      if (index !== enemy) {
        marbles--;
        this.wells[index]++;
      }
    }
    if (index !== home) {
      const opposite = index + 2 * (6 - index);
      if (
        this.turn * 7 <= index && index < (this.turn + 1) * 7 &&
        this.wells[index] === 1 && this.wells[opposite] > 0
      ) {
        this.wells[home] += 1 + this.wells[opposite];
        this.wells[index] = 0;
        this.wells[opposite] = 0;
      }
      this.turn ^= 1;
    }
    const sum0 = this.wells.slice(0, 6).reduce((a, b) => a + b, 0);
    const sum1 = this.wells.slice(7, 13).reduce((a, b) => a + b, 0);
    if (sum0 === 0) {
      this.wells[13] += sum1;
      this.wells.fill(0, 7, 13);
    } else if (sum1 === 0) {
      this.wells[6] += sum0;
      this.wells.fill(0, 7, 13);
    }
    return true;
  }

  toStr() {
    let wellsStr = this.wells.map(x => (x < 10 ? " " : "") + x);
    return (
        "        1    2    3    4    5    6\n" +
        "+----+----+----+----+----+----+----+----+\n" +
        "|    | " + [].concat(wellsStr.slice(7, 13)).reverse().join(" | ") + " |    |\n" +
        "| " + wellsStr[13] + " |----+----+----+----+----+----| " + wellsStr[6] + " |\n" +
        "|    | " + wellsStr.slice(0, 6).join(" | ") + " |    |\n" +
        "+----+----+----+----+----+----+----+----+"
    );
  }
}

module.exports = Board;