// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet, { latLng } from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

import { Board, Cache, CacheUI } from "./board.ts";

import { Inventory, InventoryUI } from "./inventory.ts";

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

// Location of our classroom (as identified on Google Maps)
const DEFAULT_LOCATION = leaflet.latLng(36.98949379578401, -122.06277128548504);
let startLocation = DEFAULT_LOCATION;
const loadedLastLocation = localStorage.getItem("currentLocation");
if (loadedLastLocation) {
  const loadedCoords = loadedLastLocation.split(",");
  startLocation = leaflet.latLng(
    parseFloat(loadedCoords[0]),
    parseFloat(loadedCoords[1]),
  );
}

let currentLocation = board.pointToCell(startLocation);

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!, {
  center: startLocation,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

const overlayLayer = leaflet.layerGroup();
overlayLayer.setZIndex(400);
overlayLayer.addTo(map);

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>',
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(startLocation);
playerMarker.bindPopup("You are here. Hello here.");
playerMarker.addTo(map);

// Display the player's points
const inventory = new Inventory();
const inventoryUI = new InventoryUI();
inventoryUI.updatePanel(inventory.getCoins());

function createCache(i: number, j: number): Cache {
  const coinCount = Math.floor(luck([i, j, "initialValue"].toString()) * 100);
  const cache = board.addCache(i, j, coinCount);
  return cache;
}

function renderCache(cache: Cache): leaflet.Rectangle {
  const bounds = board.getCellBounds(cache.cell!);
  const rect = leaflet.rectangle(bounds);
  rect.addTo(overlayLayer);
  return rect;
}

function bindCachePopup(rect: leaflet.Rectangle, cache: Cache) {
  // Handle interactions with the cache
  rect.bindPopup(() => {
    const popupDiv = document.createElement("div");
    popupDiv.style.textAlign = "center";
    popupDiv.innerHTML = `This is Cache (${cache.cell!.j}, ${
      cache.cell!.i
    }) <br>
      <div><span id="coins"></span></div>
    `;

    const coinsSpan = popupDiv.querySelector<HTMLSpanElement>("#coins")!;
    CacheUI.updatePanelText(cache, coinsSpan);

    // Create a Collect button
    const collectButton = document.createElement("button");
    collectButton.id = "collect";
    collectButton.innerHTML = "Collect";
    collectButton.addEventListener("click", () => {
      const withdrawnCoin = cache.withdraw();
      if (withdrawnCoin) {
        inventory.deposit(withdrawnCoin);
        inventoryUI.updatePanel(inventory.getCoins());
        board.updateCacheMementoState(cache);
        CacheUI.updatePanelText(cache, coinsSpan);
      }
    });
    popupDiv.append(collectButton);

    // Create a Deposit button
    const depositButton = document.createElement("button");
    depositButton.id = "deposit";
    depositButton.innerHTML = "Deposit";
    depositButton.addEventListener("click", () => {
      const withdrawnCoin = inventory.withdraw();
      if (withdrawnCoin) {
        cache.deposit(withdrawnCoin);
        inventoryUI.updatePanel(inventory.getCoins());
        board.updateCacheMementoState(cache);
        CacheUI.updatePanelText(cache, coinsSpan);
      }
    });
    popupDiv.append(depositButton);

    return popupDiv;
  });
}

// Add caches to the map by cell numbers
function spawnCache(i: number, j: number) {
  const cache = createCache(i, j);
  const bounds = renderCache(cache);
  bindCachePopup(bounds, cache);
}

let playerLocationHistory: leaflet.LatLng[] = [];
const loadPlayerHistory = localStorage.getItem("playerPath");
if (loadPlayerHistory) {
  playerLocationHistory = JSON.parse(loadPlayerHistory);
  leaflet.polyline(playerLocationHistory, { color: "red" }).addTo(overlayLayer);
}

function calculateNewLocation(i_dir: number, j_dir: number) {
  return currentLocation = board.getCell(
    currentLocation.i + i_dir,
    currentLocation.j + j_dir,
  );
}

function saveNewLocation(newPoint: leaflet.LatLng) {
  localStorage.setItem("currentLocation", `${newPoint.lat},${newPoint.lng}`);
  playerLocationHistory.push(newPoint);
  localStorage.setItem("playerPath", JSON.stringify(playerLocationHistory));
}

function updatePlayerMarker(newPoint: leaflet.LatLng) {
  map.panTo(newPoint, { animate: true });
  playerMarker.setLatLng(newPoint);
}

function drawPlayerPath() {
  leaflet.polyline(playerLocationHistory, { color: "red" }).addTo(overlayLayer);
}

function spawnNeighborhoodCaches() {
  board.regenerateCaches();
  // Look around the player's neighborhood for caches to spawn IN WORLD COORDS
  for (
    let i = -NEIGHBORHOOD_SIZE + currentLocation.i;
    i < NEIGHBORHOOD_SIZE + currentLocation.i;
    i++
  ) {
    for (
      let j = -NEIGHBORHOOD_SIZE + currentLocation.j;
      j < NEIGHBORHOOD_SIZE + currentLocation.j;
      j++
    ) {
      // If location i,j is lucky enough, spawn a cache!
      if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
        spawnCache(i, j);
      }
    }
  }
}

function movePlayer(i_dir: number, j_dir: number) {
  overlayLayer.clearLayers();

  const currentLocation = calculateNewLocation(i_dir, j_dir);
  const newPoint = board.cellToPoint(currentLocation);

  saveNewLocation(newPoint);
  updatePlayerMarker(newPoint);

  spawnNeighborhoodCaches();
  drawPlayerPath();
}

function setUpButtons() {
  const controlPanelButtons =
    document.querySelector<HTMLDivElement>("#controlPanel")!.children;
  controlPanelButtons[0].addEventListener("click", () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      playerLocationHistory.length = 0;
      currentLocation = board.pointToCell(
        latLng(pos.coords.latitude, pos.coords.longitude),
      );
      movePlayer(0, 0);
    });
  });

  controlPanelButtons[1].addEventListener("click", () => {
    movePlayer(1, 0);
  });
  controlPanelButtons[2].addEventListener("click", () => {
    movePlayer(-1, 0);
  });
  controlPanelButtons[3].addEventListener("click", () => {
    movePlayer(0, -1);
  });
  controlPanelButtons[4].addEventListener("click", () => {
    movePlayer(0, 1);
  });

  controlPanelButtons[5].addEventListener("click", () => {
    const response: string = prompt("Are you sure? (Y/N)")?.toLowerCase()!;
    if (response == "y") {
      playerLocationHistory.length = 0;
      inventory.reset();
      inventoryUI.resetPanel();
      board.resetBoard();
      localStorage.clear();
      currentLocation = board.pointToCell(DEFAULT_LOCATION);
      movePlayer(0, 0);
    }
  });
}

function main() {
  setUpButtons();
  movePlayer(0, 0);
}

main();
