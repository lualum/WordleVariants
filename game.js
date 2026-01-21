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
      this.gambleNextHiddenIndex = null; // Track next hidden index for Gamble
      this.fakeLetter = ""; // For Fakele
      this.fakePosition = -1; // For Fakele
      this.oddslePrefilledWords = []; // For Oddsle mode

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
         this.wordLength,
      );

      if (this.gameType === GameTypes.DUODLE) {
         // Generate second word with different seed
         const hash = this.wordManager.hashDate(new Date()) + 12345;
         const index = hash % this.wordManager.answerList.length;
         this.targetWord2 = this.wordManager.answerList[index].toUpperCase();
      }

      document.getElementById("game-container").style.display = "flex";
      this.uiManager.createBoard();
      this.uiManager.setupEventListeners();
      this.uiManager.updateGameTitle();

      if (this.gameType === GameTypes.FAKELE) {
         // Generate fake letter and position
         const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
         const hash = this.wordManager.hashDate(new Date());
         this.fakePosition = hash % this.wordLength;
         this.fakeLetter = letters[Math.floor((hash * 7) % 26)];
      }

      if (this.gameType === GameTypes.ODDSLE) {
         // Generate two deterministic prefilled words that are NOT the target
         const hash = this.wordManager.hashDate(new Date());

         // First prefilled word
         let index1 = hash % this.wordManager.answerList.length;
         this.oddslePrefilledWords[0] =
            this.wordManager.answerList[index1].toUpperCase();

         // Ensure first word is not the target
         let offset1 = 1;
         while (this.oddslePrefilledWords[0] === this.targetWord) {
            index1 = (hash + offset1) % this.wordManager.answerList.length;
            this.oddslePrefilledWords[0] =
               this.wordManager.answerList[index1].toUpperCase();
            offset1++;
         }

         // Second prefilled word (use different seed)
         let index2 = (hash * 7919) % this.wordManager.answerList.length;
         this.oddslePrefilledWords[1] =
            this.wordManager.answerList[index2].toUpperCase();

         // Ensure second word is not the target and not same as first word
         let offset2 = 1;
         while (
            this.oddslePrefilledWords[1] === this.targetWord ||
            this.oddslePrefilledWords[1] === this.oddslePrefilledWords[0]
         ) {
            index2 =
               (hash * 7919 + offset2) % this.wordManager.answerList.length;
            this.oddslePrefilledWords[1] =
               this.wordManager.answerList[index2].toUpperCase();
            offset2++;
         }
      }

      // Load saved state first
      const hasLoadedState = this.stateManager.loadGameState();

      // Only generate first hidden index if no saved state
      if (this.gameType === GameTypes.GAMBLE && !hasLoadedState) {
         const hash = this.wordManager.hashDate(new Date());
         this.gambleNextHiddenIndex = hash % this.wordLength;
      }

      if (hasLoadedState) {
         this.uiManager.restoreVisualState();
      } else {
         // Add prefilled guesses for Oddsle
         if (this.gameType === GameTypes.ODDSLE) {
            this.addPrefilledGuesses();
         } else {
            this.addNewGuess();
            // Apply gamble preview after adding the first guess
            if (this.gameType === GameTypes.GAMBLE) {
               this.uiManager.applyGamblePreview();
            }
         }
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

   addPrefilledGuesses() {
      // Add first prefilled guess
      this.addNewGuess();
      const word1 = this.oddslePrefilledWords[0];
      for (let i = 0; i < word1.length; i++) {
         this.addLetter(word1[i]);
      }
      this.currentGuess.evaluateAgainst(this.targetWord);
      this.currentGuess.isSubmitted = true;

      // Update visual state to show colors
      this.currentGuess.letters.forEach((letter) => {
         letter.updateElement();
      });

      this.guesses.push(this.currentGuess);
      this.uiManager.updateKeyboardFromGuess(this.currentGuess);

      // Add second prefilled guess
      this.addNewGuess();
      const word2 = this.oddslePrefilledWords[1];
      for (let i = 0; i < word2.length; i++) {
         this.addLetter(word2[i]);
      }
      this.currentGuess.evaluateAgainst(this.targetWord);
      this.currentGuess.isSubmitted = true;

      // Update visual state to show colors
      this.currentGuess.letters.forEach((letter) => {
         letter.updateElement();
      });

      this.guesses.push(this.currentGuess);
      this.uiManager.updateKeyboardFromGuess(this.currentGuess);

      // Add new empty guess for player
      this.addNewGuess();
      this.stateManager.saveGameState();
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
      if (this.gameType === GameTypes.FAKELE) {
         this.evaluateFakeleGuess();
      } else if (this.gameType === GameTypes.GAMBLE) {
         this.evaluateGambleGuess();
      } else if (this.gameType === GameTypes.ODDSLE) {
         this.currentGuess.evaluateAgainst(this.targetWord);
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
      // Use pre-calculated hidden index
      const hiddenIndex = this.gambleNextHiddenIndex;
      this.gambleHiddenIndices.push(hiddenIndex);

      // Calculate next hidden index for preview using seeded random
      if (this.guesses.length < this.maxGuesses - 1) {
         // Use combination of date hash and guess count for deterministic randomness
         const hash = this.wordManager.hashDate(new Date());
         const seed = (hash * (this.guesses.length + 1) * 7919) % 982451653;
         this.gambleNextHiddenIndex = seed % this.wordLength;
      }

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

   evaluateFakeleGuess() {
      const word = this.currentGuess.getWord();
      const targetLetters = this.targetWord.split("");
      const guessLetters = word.split("");

      // Create a modified target that includes the fake letter at fakePosition
      const modifiedTarget = [...targetLetters];
      const realLetterAtFakePos = targetLetters[this.fakePosition];

      // First pass: mark correct letters
      for (let i = 0; i < this.wordLength; i++) {
         if (i === this.fakePosition) {
            // At fake position: both the real letter AND fake letter are "correct"
            if (
               guessLetters[i] === realLetterAtFakePos ||
               guessLetters[i] === this.fakeLetter
            ) {
               this.currentGuess.letters[i].setState("correct");
               targetLetters[i] = null;
               guessLetters[i] = null;
            }
         } else if (guessLetters[i] === targetLetters[i]) {
            this.currentGuess.letters[i].setState("correct");
            targetLetters[i] = null;
            guessLetters[i] = null;
         }
      }

      // Add fake letter to available pool for present checks
      const availableLetters = targetLetters.filter((l) => l !== null);
      availableLetters.push(this.fakeLetter);

      // Second pass: mark present letters
      for (let i = 0; i < this.wordLength; i++) {
         if (!guessLetters[i]) continue; // Already marked correct

         const letterIndex = availableLetters.indexOf(guessLetters[i]);
         if (letterIndex !== -1) {
            this.currentGuess.letters[i].setState("present");
            availableLetters[letterIndex] = null; // Remove to prevent double-counting
         } else {
            this.currentGuess.letters[i].setState("absent");
         }
      }

      this.currentGuess.isSubmitted = true;
   }

   evaluateDuodleGuess() {
      const word = this.currentGuess.getWord();

      // Evaluate against first word (unless already found)
      let states1;
      if (this.duodleWord1Found) {
         // Don't show anything if word already found
         states1 = Array(this.wordLength).fill("empty");
      } else {
         states1 = this.evaluateWordAgainst(word, this.targetWord);
      }

      // Evaluate against second word (unless already found)
      let states2;
      if (this.duodleWord2Found) {
         // Don't show anything if word already found
         states2 = Array(this.wordLength).fill("empty");
      } else {
         states2 = this.evaluateWordAgainst(word, this.targetWord2);
      }

      // Store both states in the letters
      for (let i = 0; i < this.wordLength; i++) {
         const state1 = states1[i];
         const state2 = states2[i];

         // First board uses normal state
         this.currentGuess.letters[i].setState(state1);

         // Second board state stored separately
         this.currentGuess.letters[i].state2 = state2;
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
            (letter) => letter.state === "present",
         );
      } else if (this.gameType === GameTypes.DUODLE) {
         // Win condition: guessed both words
         const matchesWord1 = word === this.targetWord;
         const matchesWord2 = word === this.targetWord2;

         if (!this.duodleWord1Found && matchesWord1) {
            this.duodleWord1Found = true;
            // Gray out first board
            this.uiManager.grayOutBoard(1);
         }
         if (!this.duodleWord2Found && matchesWord2) {
            this.duodleWord2Found = true;
            // Gray out second board
            this.uiManager.grayOutBoard(2);
         }

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
         // Apply gamble preview after adding new guess
         if (this.gameType === GameTypes.GAMBLE) {
            this.uiManager.applyGamblePreview();
         }
         this.stateManager.saveGameState();
      }
   }

   showEndGamePopup() {
      this.uiManager.showEndGamePopup();
   }

   resetGame() {
      // Regenerate oddsle prefilled words
      if (this.gameType === GameTypes.ODDSLE) {
         const hash = this.wordManager.hashDate(new Date());

         let index1 = hash % this.wordManager.answerList.length;
         this.oddslePrefilledWords[0] =
            this.wordManager.answerList[index1].toUpperCase();

         let offset1 = 1;
         while (this.oddslePrefilledWords[0] === this.targetWord) {
            index1 = (hash + offset1) % this.wordManager.answerList.length;
            this.oddslePrefilledWords[0] =
               this.wordManager.answerList[index1].toUpperCase();
            offset1++;
         }

         let index2 = (hash * 7919) % this.wordManager.answerList.length;
         this.oddslePrefilledWords[1] =
            this.wordManager.answerList[index2].toUpperCase();

         let offset2 = 1;
         while (
            this.oddslePrefilledWords[1] === this.targetWord ||
            this.oddslePrefilledWords[1] === this.oddslePrefilledWords[0]
         ) {
            index2 =
               (hash * 7919 + offset2) % this.wordManager.answerList.length;
            this.oddslePrefilledWords[1] =
               this.wordManager.answerList[index2].toUpperCase();
            offset2++;
         }
      }
   }
}
