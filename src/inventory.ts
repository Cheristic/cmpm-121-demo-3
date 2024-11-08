export interface Coin {
  readonly i: number;
  readonly j: number;
  readonly serial: number;
}

export class Inventory {
  private coins: Coin[] = [];
  private inventoryPanel = document.querySelector<HTMLDivElement>(
    "#inventoryPanel",
  )!;

  constructor() {
    this.inventoryPanel.classList.add("#statusPanel");
    this.inventoryPanel.innerHTML = "No points yet...";
  }

  withdraw(): Coin | undefined {
    if (this.coins.length == 0) return;

    const coin = this.coins.pop();
    if (this.coins.length == 0) {
      this.inventoryPanel.innerHTML = "No points yet...";
    } else {this.inventoryPanel.innerHTML = `
        Inventory holds ${this.coins.length} coins. <br>
        Top coin: ${coin?.i}:${coin?.j}#${coin?.serial}
        `;}
    return coin;
  }

  deposit(coin: Coin | undefined) {
    if (!coin) return;

    this.coins.push(coin);
    this.inventoryPanel.innerHTML = `
        Inventory holds ${this.coins.length} coins. <br>
        Top coin: ${coin?.i}:${coin?.j}#${coin?.serial}
        `;
  }

  getTopCoinText(): string | null {
    if (this.coins.length == 0) return null;
    const coin = this.coins[this.coins.length - 1];
    return `Top coin: ${coin?.i}:${coin?.j}#${coin?.serial}`;
  }
}
