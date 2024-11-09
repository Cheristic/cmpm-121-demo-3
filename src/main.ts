// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet, { latLng } from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

import { Board } from "./board.ts";

import { Inventory } from "./inventory.ts";

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

// Add caches to the map by cell numbers
function spawnCache(i: number, j: number) {
  // Convert cell numbers into lat/lng bounds
  const coinCount = Math.floor(luck([i, j, "initialValue"].toString()) * 100);

  const cache = board.addCache(i, j, coinCount);
  const bounds = board.getCellBounds(cache.cell!);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(overlayLayer);

  // Handle interactions with the cache
  rect.bindPopup(() => {
    const popupDiv = document.createElement("div");
    popupDiv.style.textAlign = "center";
    popupDiv.innerHTML = `This is Cache (${j}, ${i}) <br>
      <div><span id="coins"></span></div>
    `;
    cache.linkPanel(popupDiv.querySelector<HTMLSpanElement>("#coins")!);

    const collectButton = document.createElement("button");
    collectButton.id = "collect";
    collectButton.innerHTML = "Collect";

    // Clicking the button decrements the cache's value and increments the player's points
    collectButton.addEventListener("click", () => {
      inventory.deposit(cache.withdraw());
      board.updateCacheMementoState(cache);
    });
    popupDiv.append(collectButton);

    const depositButton = document.createElement("button");
    depositButton.id = "deposit";
    depositButton.innerHTML = "Deposit";

    // Clicking the button decrements the cache's value and increments the player's points
    depositButton.addEventListener("click", () => {
      cache.deposit(inventory.withdraw());
      board.updateCacheMementoState(cache);
    });
    popupDiv.append(depositButton);

    return popupDiv;
  });
}

const playerLocationHistory: leaflet.LatLng[] = [];

function movePlayer(i_dir: number, j_dir: number) {
  overlayLayer.clearLayers();
  currentLocation = board.getCell(
    currentLocation.i + i_dir,
    currentLocation.j + j_dir,
  );
  const newPoint = board.cellToPoint(currentLocation);
  localStorage.setItem("currentLocation", `${newPoint.lat},${newPoint.lng}`);
  map.panTo(newPoint, {
    animate: true,
  });
  playerLocationHistory.push(newPoint);
  playerMarker.setLatLng(newPoint);

  leaflet.polyline(playerLocationHistory, { color: "red" }).addTo(overlayLayer);

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
      inventory.resetInventory();
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
