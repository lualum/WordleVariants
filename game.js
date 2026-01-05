import { GameTypeConfig, GameTypes, getGameTypeForDate } from "./gameTypes.js";
import { Guess } from "./guess.js";
import { StateManager } from "./stateManager.js";
import { UIManager } from "./uiManager.js";
import { WordManager } from "./wordManager.js";

export class TARDLEGame {
   constructor() {
      // Check for test mode in URL
      const urlParams = new URLSearchParams(window.location.search);
      const testDay = urlParams.get("day");
      const testDate = testDay ? this.getDateForDay(testDay) : new Date();

      // Game Type Properties
      this.gameType = getGameTypeForDate(testDate);
      this.gameConfig = GameTypeConfig[this.gameType];

      // Game State Properties
      this.targetWord = "";
      this.targetWord2 = null; // For Duodle
      this.guesses = [];
      this.currentGuess = null;
      this.currentPosition = 0;
      this.gameState = "playing"; // playing, won, lost
      this.maxGuesses = this.gameConfig.maxGuesses;
      this.wordLength = this.gameConfig.wordLength;

      // Game-specific properties
      this.revealedGreens = new Set(); // For Hardle
      this.revealedYellows = new Set(); // For Hardle
      this.gambleHiddenIndices = []; // For Gamble mode

      // Module Initialization
      this.wordManager = new WordManager();
      this.uiManager = new UIManager(this);
      this.stateManager = new StateManager(this);

      this.initializeGame();
   }

   getDateForDay(dayName) {
      const days = {
         monday: 1,
         tuesday: 2,
         wednesday: 3,
         thursday: 4,
         friday: 5,
         saturday: 6,
         sunday: 0,
      };

      const targetDay = days[dayName.toLowerCase()];
      if (targetDay === undefined) return new Date();

      const date = new Date();
      const currentDay = date.getDay();
      const diff = targetDay - currentDay;
      date.setDate(date.getDate() + diff);

      return date;
   }

   async initializeGame() {
      await this.wordManager.loadWords();
      this.targetWord = this.wordManager.getDailyWord(
         this.gameType,
         this.wordLength
      );

      if (this.gameType === GameTypes.DUODLE) {
         // Generate second word with different seed
         const hash = this.wordManager.hashDate(new Date()) + 12345;
         const index = hash % this.wordManager.answerList.length;
         this.targetWord2 = this.wordManager.answerList[index].toUpperCase();
      }

      console.log("Today's word:", this.targetWord);
      if (this.targetWord2) console.log("Second word:", this.targetWord2);

      document.getElementById("gameContainer").style.display = "flex";
      this.uiManager.createBoard();
      this.uiManager.setupEventListeners();
      this.uiManager.updateGameTitle();

      if (this.stateManager.loadGameState()) {
         this.uiManager.restoreVisualState();
      } else {
         this.addNewGuess();
      }
   }

   addNewGuess() {
      if (
         this.guesses.length < this.maxGuesses &&
         this.gameState === "playing"
      ) {
         this.currentGuess = new Guess(this.wordLength);
         this.currentPosition = 0;
         this.uiManager.bindGuessToRow(this.currentGuess, this.guesses.length);
      }
   }

   addLetter(letter) {
      if (!this.currentGuess || this.currentPosition >= this.wordLength) return;
      this.currentGuess.addLetter(letter, this.currentPosition);
      this.currentPosition++;
   }

   deleteLetter() {
      if (!this.currentGuess || this.currentPosition <= 0) return;
      this.currentPosition--;
      this.currentGuess.removeLetter(this.currentPosition);
   }

   submitGuess() {
      if (!this.currentGuess || !this.currentGuess.isComplete) {
         this.uiManager.showMessage("Not enough letters");
         return;
      }

      const word = this.currentGuess.getWord();
      if (!this.wordManager.isValidWord(word, this.wordLength)) {
         this.uiManager.showMessage("Not in word list");
         return;
      }

      // Hardle validation
      if (
         this.gameType === GameTypes.HARDLE &&
         !this.validateHardleGuess(word)
      ) {
         this.uiManager.showMessage("Must use revealed hints");
         return;
      }

      // Evaluate guess based on game type
      if (this.gameType === GameTypes.GAMBLE) {
         this.evaluateGambleGuess();
      } else if (this.gameType === GameTypes.MANGLE) {
         this.evaluateMangleGuess();
      } else if (this.gameType === GameTypes.DUODLE) {
         this.evaluateDuodleGuess();
      } else {
         this.currentGuess.evaluateAgainst(this.targetWord);
      }

      // Update revealed hints for Hardle
      if (this.gameType === GameTypes.HARDLE) {
         this.updateRevealedHints();
      }

      this.currentGuess.animateReveal();

      const animationDuration = this.wordLength * 300 + 600;
      setTimeout(() => {
         this.uiManager.updateKeyboardFromGuess(this.currentGuess);
      }, animationDuration);

      this.guesses.push(this.currentGuess);

      setTimeout(() => {
         this.checkGameStatus(word);
      }, animationDuration);
   }

   validateHardleGuess(word) {
      // Check if all revealed greens are used in correct positions
      for (const posChar of this.revealedGreens) {
         const [pos, char] = posChar.split(":");
         if (word[parseInt(pos)] !== char) {
            return false;
         }
      }

      // Check if all revealed yellows are used somewhere in the word
      for (const char of this.revealedYellows) {
         if (!word.includes(char)) {
            return false;
         }
      }

      return true;
   }

   updateRevealedHints() {
      this.currentGuess.letters.forEach((letter, index) => {
         if (letter.state === "correct") {
            this.revealedGreens.add(`${index}:${letter.character}`);
         } else if (letter.state === "present") {
            this.revealedYellows.add(letter.character);
         }
      });
   }

   evaluateGambleGuess() {
      // Pick random hidden indices for this guess
      const hiddenIndex = Math.floor(Math.random() * this.wordLength);
      this.gambleHiddenIndices.push(hiddenIndex);

      const word = this.currentGuess.getWord();
      const targetLetters = this.targetWord.split("");
      const guessLetters = word.split("");

      // First pass: mark correct letters (except hidden)
      for (let i = 0; i < this.wordLength; i++) {
         if (i === hiddenIndex) {
            this.currentGuess.letters[i].setState("hidden");
            continue;
         }
         if (guessLetters[i] === targetLetters[i]) {
            this.currentGuess.letters[i].setState("correct");
            targetLetters[i] = null;
            guessLetters[i] = null;
         }
      }

      // Second pass: mark present letters (except hidden)
      for (let i = 0; i < this.wordLength; i++) {
         if (i === hiddenIndex) continue;
         if (guessLetters[i] && targetLetters.includes(guessLetters[i])) {
            this.currentGuess.letters[i].setState("present");
            const targetIndex = targetLetters.indexOf(guessLetters[i]);
            targetLetters[targetIndex] = null;
         } else if (guessLetters[i]) {
            this.currentGuess.letters[i].setState("absent");
         }
      }

      this.currentGuess.isSubmitted = true;
   }

   evaluateMangleGuess() {
      this.currentGuess.evaluateAgainst(this.targetWord);

      // Convert all correct and present to "mangle" state
      this.currentGuess.letters.forEach((letter) => {
         if (letter.state === "correct" || letter.state === "present") {
            letter.state = "mangle";
         }
      });
   }

   evaluateDuodleGuess() {
      const word = this.currentGuess.getWord();

      // Evaluate against both words
      const states1 = this.evaluateWordAgainst(word, this.targetWord);
      const states2 = this.evaluateWordAgainst(word, this.targetWord2);

      // Combine states - take the "better" state for each position
      for (let i = 0; i < this.wordLength; i++) {
         const state1 = states1[i];
         const state2 = states2[i];

         if (state1 === "correct" || state2 === "correct") {
            this.currentGuess.letters[i].setState("correct");
         } else if (state1 === "present" || state2 === "present") {
            this.currentGuess.letters[i].setState("present");
         } else {
            this.currentGuess.letters[i].setState("absent");
         }
      }

      this.currentGuess.isSubmitted = true;
   }

   evaluateWordAgainst(word, targetWord) {
      const states = [];
      const targetLetters = targetWord.split("");
      const guessLetters = word.split("");

      // First pass: mark correct letters
      for (let i = 0; i < this.wordLength; i++) {
         if (guessLetters[i] === targetLetters[i]) {
            states[i] = "correct";
            targetLetters[i] = null;
            guessLetters[i] = null;
         } else {
            states[i] = null;
         }
      }

      // Second pass: mark present letters
      for (let i = 0; i < this.wordLength; i++) {
         if (states[i] === "correct") continue;

         if (guessLetters[i] && targetLetters.includes(guessLetters[i])) {
            states[i] = "present";
            const targetIndex = targetLetters.indexOf(guessLetters[i]);
            targetLetters[targetIndex] = null;
         } else if (guessLetters[i]) {
            states[i] = "absent";
         }
      }

      return states;
   }

   checkGameStatus(word) {
      let won = false;

      if (this.gameType === GameTypes.YELLODLE) {
         // Win condition: all letters are yellow (present)
         won = this.currentGuess.letters.every(
            (letter) => letter.state === "present"
         );
      } else if (this.gameType === GameTypes.DUODLE) {
         // Win condition: guessed both words
         const matchesWord1 = word === this.targetWord;
         const matchesWord2 = word === this.targetWord2;

         if (!this.duodleWord1Found) this.duodleWord1Found = matchesWord1;
         if (!this.duodleWord2Found) this.duodleWord2Found = matchesWord2;

         won = this.duodleWord1Found && this.duodleWord2Found;
      } else {
         // Normal win condition
         won = word === this.targetWord;
      }

      if (won) {
         this.gameState = "won";
         setTimeout(() => this.showEndGamePopup(), 1500);
      } else if (this.guesses.length >= this.maxGuesses) {
         this.gameState = "lost";
         setTimeout(() => this.showEndGamePopup(), 1500);
      }

      if (this.gameState !== "playing") {
         this.currentGuess = null;
         this.stateManager.saveGameState();
      } else {
         this.addNewGuess();
         this.stateManager.saveGameState();
      }
   }

   showEndGamePopup() {
      this.uiManager.showEndGamePopup();
   }

   resetGame() {
      console.log("Resetting game...");
      this.stateManager.clearSavedState();

      this.guesses = [];
      this.currentGuess = null;
      this.currentPosition = 0;
      this.gameState = "playing";
      this.revealedGreens = new Set();
      this.revealedYellows = new Set();
      this.gambleHiddenIndices = [];
      this.duodleWord1Found = false;
      this.duodleWord2Found = false;

      this.uiManager.clearBoard();
      this.uiManager.clearKeyboard();
      this.uiManager.hideMessage();

      this.addNewGuess();
      console.log("Game reset complete. New target word:", this.targetWord);
   }
}
