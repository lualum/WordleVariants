import { TARDLEGame } from "./game.js";

document.addEventListener("DOMContentLoaded", async () => {
   const gameAppContainer = document.getElementById("game-app-container");

   const game = new TARDLEGame();
   window.game = game;

   gameAppContainer.classList.add("loaded");
});
