import { TARDLEGame } from "./game.js";

document.addEventListener("DOMContentLoaded", async () => {
   const gameContainer = document.getElementById("game-container");

   const game = new TARDLEGame();
   window.game = game;

   gameContainer.classList.add("loaded");
});
