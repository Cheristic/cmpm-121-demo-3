import leaflet from "leaflet";

import { Coin } from "./inventory.ts";

export class Cache {
  cell: Cell | undefined;
  coins: Coin[];
  panel: HTMLSpanElement | null = null;

  constructor() {
    this.coins = [];
  }

  withdraw(): Coin | undefined {
    return this.coins.pop();
  }

  deposit(coin: Coin | undefined) {
    if (coin) this.coins.push(coin);
  }

  toMemento() {
    return this.coins
      .map((coin) => `${coin.i}:${coin.j}#${coin.serial}`)
      .join(",");
  }

  createNewCache(cell: Cell, coinCount: number) {
    this.cell = cell;
    for (let serial = 0; serial < coinCount; serial++) {
      this.coins.push({ i: cell.i, j: cell.j, serial: serial });
    }
  }

  restoreCacheFromMemento(cell: Cell, memento: string) {
    this.cell = cell;
    this.coins = memento
      .split(",")
      .map((coin) => {
        const [i, j, serial] = coin.split(/[:#]/).map(Number);
        return { i, j, serial };
      });
  }
}

export class CacheUI {
  static updatePanelText(cache: Cache, panel: HTMLSpanElement) {
    if (cache.coins.length == 0) {
      panel.innerHTML = "No coins yet...";
    } else {
      const topCoin = cache.coins[cache.coins.length - 1];
      panel.innerHTML = `Cache holds ${cache.coins.length} coins. <br>
          Top coin: ${topCoin.i}:${topCoin.j}#${topCoin.serial}`;
    }
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
    const mementoFromData = localStorage.getItem("memento");
    if (mementoFromData) {
      const parsedMemento = JSON.parse(mementoFromData);
      this.mementos = new Map(
        parsedMemento.map((
          obj: [cell: Cell, coins: string],
        ) => [this.getCanonicalCell(obj[0]), obj[1]]),
      );
    } else {
      this.mementos = new Map();
    }
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
    this.nextEmptyCacheIndex = 0;
  }

  updateCacheMementoState(cache: Cache) {
    this.mementos.set(cache.cell!, cache.toMemento());
    localStorage.setItem("memento", JSON.stringify(Array.from(this.mementos)));
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
      cache.restoreCacheFromMemento(cell, this.mementos.get(cell)!);
    } else cache.createNewCache(cell, coinCount);

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
