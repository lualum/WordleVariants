import { Guess } from "./guess.js";

export class StateManager {
	constructor(game) {
		this.game = game;
	}

	saveGameState() {
		const gameData = {
			date: this.getTodayString(),
			gameType: this.game.gameType,
			guesses: this.game.guesses.map((guess) => guess.toJSON()),
			gameState: this.game.gameState,
			currentPosition: this.game.currentPosition,
			hasCurrentGuess: this.game.currentGuess !== null,
			revealedGreens: Array.from(this.game.revealedGreens),
			revealedYellows: Array.from(this.game.revealedYellows),
			gambleHiddenIndices: this.game.gambleHiddenIndices,
			gambleNextHiddenIndex: this.game.gambleNextHiddenIndex,
			duodleWord1Found: this.game.duodleWord1Found || false,
			duodleWord2Found: this.game.duodleWord2Found || false,
			targetWord2: this.game.targetWord2,
		};
		this.setCookie("tardleGame", JSON.stringify(gameData), 1);
	}

	loadGameState() {
		const savedData = this.getCookie("tardleGame");
		if (!savedData) return false;

		try {
			const gameData = JSON.parse(savedData);
			if (gameData.date !== this.getTodayString()) {
				this.clearSavedState();
				return false;
			}

			// Verify game type matches
			if (gameData.gameType !== this.game.gameType) {
				this.clearSavedState();
				return false;
			}

			this.game.guesses = gameData.guesses.map((g) => Guess.fromJSON(g));
			this.game.gameState = gameData.gameState || "playing";
			this.game.currentPosition = gameData.currentPosition || 0;

			if (gameData.revealedGreens) {
				this.game.revealedGreens = new Set(gameData.revealedGreens);
			}
			if (gameData.revealedYellows) {
				this.game.revealedYellows = new Set(gameData.revealedYellows);
			}
			if (gameData.gambleHiddenIndices) {
				this.game.gambleHiddenIndices = gameData.gambleHiddenIndices;
			}
			if (
				gameData.gambleNextHiddenIndex !== undefined &&
				gameData.gambleNextHiddenIndex !== null
			) {
				this.game.gambleNextHiddenIndex = gameData.gambleNextHiddenIndex;
			}
			if (gameData.duodleWord1Found !== undefined) {
				this.game.duodleWord1Found = gameData.duodleWord1Found;
			}
			if (gameData.duodleWord2Found !== undefined) {
				this.game.duodleWord2Found = gameData.duodleWord2Found;
			}
			if (gameData.targetWord2) {
				this.game.targetWord2 = gameData.targetWord2;
			}

			if (this.game.gameState === "playing" && gameData.hasCurrentGuess) {
				this.game.addNewGuess();
			}
			return true;
		} catch (error) {
			console.error("Error loading saved game:", error);
			return false;
		}
	}

	setCookie(name, value, days = 1) {
		const expires = new Date();
		expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
		document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
	}

	clearSavedState() {
		this.setCookie("tardleGame", "", -1);
	}

	getCookie(name) {
		const nameEQ = name + "=";
		const ca = document.cookie.split(";");
		for (let c of ca) {
			c = c.trim();
			if (c.indexOf(nameEQ) === 0)
				return c.substring(nameEQ.length, c.length);
		}
		return null;
	}

	getTodayString() {
		return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
	}
}
