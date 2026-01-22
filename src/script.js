import { WORDLEGame } from "./game.js";

document.addEventListener("DOMContentLoaded", async () => {
	const gameAppContainer = document.getElementById("game-app-container");

	const game = new WORDLEGame();

	gameAppContainer.classList.add("loaded");
});
