// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

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
const START_LOCATION = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!, {
  center: START_LOCATION,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(START_LOCATION);
playerMarker.bindPopup("You are here. Hello here.");
playerMarker.addTo(map);

// Display the player's points
const inventory = new Inventory();

// Add caches to the map by cell numbers
function spawnCache(i: number, j: number) {
  // Convert cell numbers into lat/lng bounds
  const coinCount = Math.floor(luck([i, j, "initialValue"].toString()) * 100);

  const cache = board.addCache(i, j, coinCount);
  const bounds = board.getCellBounds(cache.cell);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

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
    });
    popupDiv.append(collectButton);

    const depositButton = document.createElement("button");
    depositButton.id = "deposit";
    depositButton.innerHTML = "Deposit";

    // Clicking the button decrements the cache's value and increments the player's points
    depositButton.addEventListener("click", () => {
      cache.deposit(inventory.withdraw());
    });
    popupDiv.append(depositButton);

    return popupDiv;
  });
}

// Look around the player's neighborhood for caches to spawn IN WORLD COORDS
for (
  let i = -NEIGHBORHOOD_SIZE + board.pointToCell(START_LOCATION).i;
  i < NEIGHBORHOOD_SIZE + board.pointToCell(START_LOCATION).i;
  i++
) {
  for (
    let j = -NEIGHBORHOOD_SIZE + board.pointToCell(START_LOCATION).j;
    j < NEIGHBORHOOD_SIZE + board.pointToCell(START_LOCATION).j;
    j++
  ) {
    board.foundCell(i, j);
    // If location i,j is lucky enough, spawn a cache!
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}
