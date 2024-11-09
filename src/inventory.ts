import "./style.css";

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
    this.inventoryPanel.classList.add("statusPanel");
    const inventoryData = localStorage.getItem("inventory");
    if (inventoryData) {
      this.coins = JSON.parse(inventoryData);
    }
    this.updateText();
  }

  private updateText() {
    if (this.coins.length == 0) {
      this.inventoryPanel.innerHTML = "No coins yet...";
    } else {
      const coin = this.coins[this.coins.length - 1];
      this.inventoryPanel.innerHTML = `
        Inventory holds ${this.coins.length} coins. <br>
        Top coin: ${coin?.i}:${coin?.j}#${coin?.serial}
    `;
    }
  }

  withdraw(): Coin | undefined {
    if (this.coins.length == 0) return;

    const coin = this.coins.pop();
    this.updateText();

    localStorage.setItem("inventory", JSON.stringify(this.coins));
    return coin;
  }

  deposit(coin: Coin | undefined) {
    if (!coin) return;

    this.coins.push(coin);
    this.updateText();
    localStorage.setItem("inventory", JSON.stringify(this.coins));
  }

  getTopCoinText(): string | null {
    if (this.coins.length == 0) return null;
    const coin = this.coins[this.coins.length - 1];
    return `Top coin: ${coin?.i}:${coin?.j}#${coin?.serial}`;
  }

  resetInventory() {
    this.coins.length = 0;
    this.inventoryPanel.innerHTML = "No coins yet...";
  }
}
