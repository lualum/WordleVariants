import { TARDLEGame } from "./game.js";

document.addEventListener("DOMContentLoaded", () => {
  const game = new TARDLEGame();

  window.game = game;
  console.log(
    "TARDLE Game loaded. Use 'game.resetGame()' to reset the current game."
  );
});
