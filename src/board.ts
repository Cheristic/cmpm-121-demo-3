import leaflet from "leaflet";

import { Coin } from "./inventory.ts";

export class Cache {
  cell: Cell | undefined;
  coins: Coin[];
  panel: HTMLSpanElement | null = null;

  constructor() {
    this.coins = [];
  }

  linkPanel(panel: HTMLSpanElement) {
    this.panel = panel;
    this.setPanelText();
  }

  withdraw(): Coin | undefined {
    if (this.coins.length == 0) return;

    const coin = this.coins.pop();
    this.setPanelText();
    return coin;
  }

  deposit(coin: Coin | undefined) {
    if (!coin) return;

    this.coins.push(coin);
    this.setPanelText();
  }

  private setPanelText() {
    if (this.coins.length == 0) this.panel!.innerHTML = "No coins yet...";
    else {
      const topCoin = this.coins[this.coins.length - 1];
      this.panel!.innerHTML = `
    Cache holds ${this.coins.length} coins. <br>
    Top coin: ${topCoin.i}:${topCoin.j}#${topCoin.serial}
    `;
    }
  }

  toMemento() {
    if (this.coins.length == 0) return "";
    let s: string = `${this.coins[0].i}:${this.coins[0].j}#${
      this.coins[0].serial
    }`;
    for (let i = 1; i < this.coins.length; i++) {
      s += `,${this.coins[i].i}:${this.coins[i].j}#${this.coins[i].serial}`;
    }

    return s;
  }

  discoverNewCell(cell: Cell, coinCount: number) {
    this.cell = cell;
    for (let serial = 0; serial < coinCount; serial++) {
      this.coins.push({ i: cell.i, j: cell.j, serial: serial });
    }
  }

  fromMemento(cell: Cell, memento: string) {
    this.cell = cell;
    this.coins.length = 0;
    if (memento == "") return;

    const coinMementos = memento.split(",");
    coinMementos.forEach((coin) => {
      const coinInfo = coin.split(/[:#]/);
      this.coins.push({
        i: parseInt(coinInfo[0]),
        j: parseInt(coinInfo[1]),
        serial: parseInt(coinInfo[2]),
      });
    });
  }
}

interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;
  private readonly mementos: Map<Cell, string>;
  private readonly cachePool: Cache[];
  nextEmptyCacheIndex: number = 0;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;

    this.knownCells = new Map();
    this.mementos = new Map();
    this.cachePool = [];
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    if (!this.knownCells.has(key)) this.knownCells.set(key, cell)!;
    return this.knownCells.get(key)!;
  }

  getCell(i: number, j: number): Cell {
    return this.getCanonicalCell({ i: i, j: j });
  }

  regenerateCaches() {
    this.cachePool.forEach((cache) => {
      this.mementos.set(cache.cell!, cache.toMemento());
    });
    this.nextEmptyCacheIndex = 0;
  }

  addCache(i: number, j: number, coinCount: number): Cache {
    const cell = this.getCanonicalCell({ i: i, j: j });

    let cache;
    if (this.nextEmptyCacheIndex == this.cachePool.length) {
      cache = new Cache();
      this.cachePool.push(cache);
    } else {
      cache = this.cachePool[this.nextEmptyCacheIndex];
    }

    if (this.mementos.has(cell)) {
      cache.fromMemento(cell, this.mementos.get(cell)!);
    } else cache.discoverNewCell(cell, coinCount);
    this.nextEmptyCacheIndex++;
    return cache;
  }

  pointToCell(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      i: Math.floor(point.lat / this.tileWidth),
      j: Math.floor(point.lng / this.tileWidth),
    });
  }

  cellToPoint(cell: Cell): leaflet.latLng {
    return leaflet.latLng(cell.i * this.tileWidth, cell.j * this.tileWidth);
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return leaflet.latLngBounds([
      [cell.i * this.tileWidth, cell.j * this.tileWidth],
      [(cell.i + 1) * this.tileWidth, (cell.j + 1) * this.tileWidth],
    ]);
  }

  resetBoard() {
    this.knownCells.clear();
    this.mementos.clear();
  }
}
