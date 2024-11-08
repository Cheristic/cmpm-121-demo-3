import leaflet from "leaflet";

import { Coin } from "./inventory.ts";

export class Cache {
  readonly cell: Cell;
  readonly coins: Coin[];
  panel: HTMLSpanElement | null = null;

  constructor(cell: Cell, coinCount: number) {
    this.cell = cell;
    this.coins = [];
    for (let serial = 0; serial < coinCount; serial++) {
      this.coins.push({ i: cell.i, j: cell.j, serial: serial });
    }
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
    return this.coins.toString();
  }
  fromMemento() {
    //this.coins = Array.from()
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
  private readonly caches: Map<Cell, Cache>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;

    this.knownCells = new Map();
    this.caches = new Map();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    if (!this.knownCells.has(key)) this.knownCells.set(key, cell)!;
    return this.knownCells.get(key)!;
  }

  addCache(i: number, j: number, coinCount: number): Cache {
    return new Cache(this.getCanonicalCell({ i: i, j: j }), coinCount);
  }

  pointToCell(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      i: Math.floor(point.lat / this.tileWidth),
      j: Math.floor(point.lng / this.tileWidth),
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return leaflet.latLngBounds([
      [cell.i * this.tileWidth, cell.j * this.tileWidth],
      [(cell.i + 1) * this.tileWidth, (cell.j + 1) * this.tileWidth],
    ]);
  }
}
