import "./style.css";

export interface Coin {
  readonly i: number;
  readonly j: number;
  readonly serial: number;
}

export class Inventory {
  private coins: Coin[] = [];
  private persistence: InventoryPersistence = new InventoryPersistence();

  constructor() {
    this.coins = this.persistence.loadCoins() || [];
    console.log(this.coins);
  }

  withdraw(): Coin | undefined {
    const coin = this.coins.pop();
    this.persistence.saveCoins(this.coins);
    return coin;
  }

  deposit(coin: Coin | undefined) {
    if (!coin) return;
    this.coins.push(coin);
    this.persistence.saveCoins(this.coins);
  }

  reset() {
    this.coins = [];
    this.persistence.saveCoins(this.coins);
  }

  getCoins(): Coin[] {
    return [...this.coins];
  }

  getTopCoin(): Coin | null {
    return this.coins.length > 0 ? this.coins[this.coins.length - 1] : null;
  }
}

export class InventoryUI {
  private inventoryPanel = document.querySelector<HTMLDivElement>(
    "#inventoryPanel",
  )!;

  constructor() {
    this.inventoryPanel.classList.add("statusPanel");
  }

  updatePanel(coins: Coin[]) {
    if (coins.length == 0) {
      this.inventoryPanel.innerHTML = "No coins yet...";
    } else {
      const topCoin = coins[coins.length - 1];
      this.inventoryPanel.innerHTML = `
        Inventory holds ${coins.length} coins. <br>
        Top coin: ${topCoin?.i}:${topCoin?.j}#${topCoin?.serial}
      `;
    }
  }

  resetPanel() {
    this.inventoryPanel.innerHTML = "No coins yet...";
  }
}

export class InventoryPersistence {
  private storageKey = "inventory";

  saveCoins(coins: Coin[]) {
    localStorage.setItem(this.storageKey, JSON.stringify(coins));
  }

  loadCoins(): Coin[] | null {
    const inventoryData = localStorage.getItem(this.storageKey);
    return inventoryData ? JSON.parse(inventoryData) : null;
  }
}
