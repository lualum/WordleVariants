export class UIManager {
   constructor(game) {
      this.game = game;
   }

   updateGameTitle() {
      const titleElement = document.querySelector(".title");
      if (titleElement) {
         titleElement.textContent = this.game.gameConfig.name;
      }

      const descElement = document.querySelector(".game-description");
      if (descElement) {
         descElement.textContent = this.game.gameConfig.description;
      }
   }

   createBoard() {
      const boardElement = document.getElementById("board");
      boardElement.innerHTML = "";

      for (let row = 0; row < this.game.maxGuesses; row++) {
         const rowElement = document.createElement("div");
         rowElement.className = "row";
         rowElement.id = `row-${row}`;
         for (let col = 0; col < this.game.wordLength; col++) {
            const tile = document.createElement("div");
            tile.className = "tile";
            tile.id = `tile-${row}-${col}`;
            rowElement.appendChild(tile);
         }
         boardElement.appendChild(rowElement);
      }
   }

   bindGuessToRow(guess, rowIndex) {
      const rowElement = document.getElementById(`row-${rowIndex}`);
      guess.rowElement = rowElement;
      guess.rowIndex = rowIndex;
      guess.letters.forEach((letter, colIndex) => {
         const tile = document.getElementById(`tile-${rowIndex}-${colIndex}`);
         letter.element = tile;
         letter.updateElement();
      });
   }

   restoreVisualState() {
      this.game.guesses.forEach((guess, index) => {
         this.bindGuessToRow(guess, index);
         guess.restoreVisualState();
         if (guess.isSubmitted) {
            this.updateKeyboardFromGuess(guess);
         }
      });

      if (this.game.currentGuess) {
         this.bindGuessToRow(this.game.currentGuess, this.game.guesses.length);
         this.game.currentGuess.restoreVisualState();
      }

      if (this.game.gameState === "won") {
         setTimeout(() => this.showEndGamePopup(), 500);
      } else if (this.game.gameState === "lost") {
         setTimeout(() => this.showEndGamePopup(), 500);
      }
   }

   updateKeyboardFromGuess(guess) {
      const letterStates = guess.getLetterStates();
      for (const [letter, state] of Object.entries(letterStates)) {
         const key = document.querySelector(`[data-key="${letter}"]`);
         if (key && !key.classList.contains("correct")) {
            if (
               state === "correct" ||
               state === "mangle" ||
               (state === "present" && !key.classList.contains("present"))
            ) {
               key.className = "key";
               key.classList.add(state);
            } else if (
               state === "absent" &&
               !key.classList.contains("present")
            ) {
               key.classList.add("absent");
            }
         }
      }
   }

   showMessage(text) {
      const messageElement = document.getElementById("message");
      messageElement.textContent = text;
      messageElement.classList.add("show");
      setTimeout(() => messageElement.classList.remove("show"), 3000);
   }

   hideMessage() {
      document.getElementById("message").classList.remove("show");
   }

   showEndGamePopup() {
      const popup = document.getElementById("endGamePopup");
      const resultText = document.getElementById("resultText");
      const guessCount = document.getElementById("guessCount");
      const boardPreview = document.getElementById("boardPreview");

      // Set result text
      if (this.game.gameState === "won") {
         resultText.textContent = "🎉 You Won! 🎉";
      } else {
         resultText.textContent = `The word was: ${this.game.targetWord}`;
         if (this.game.targetWord2) {
            resultText.textContent += ` & ${this.game.targetWord2}`;
         }
      }

      // Set guess count
      guessCount.textContent = `${this.game.guesses.length}/${this.game.maxGuesses}`;

      // Create board preview
      boardPreview.innerHTML = "";
      this.game.guesses.forEach((guess) => {
         const rowDiv = document.createElement("div");
         rowDiv.className = "preview-row";

         guess.letters.forEach((letter) => {
            const tileDiv = document.createElement("div");
            tileDiv.className = `preview-tile ${letter.state}`;
            rowDiv.appendChild(tileDiv);
         });

         boardPreview.appendChild(rowDiv);
      });

      popup.style.display = "flex";
   }

   setupEventListeners() {
      document.addEventListener("keydown", (e) => {
         if (
            this.game.gameState !== "playing" ||
            e.ctrlKey ||
            e.altKey ||
            e.metaKey
         )
            return;
         const key = e.key.toUpperCase();
         if (key === "ENTER") this.game.submitGuess();
         else if (key === "BACKSPACE") this.game.deleteLetter();
         else if (key.length === 1 && key.match(/[A-Z]/))
            this.game.addLetter(key);
      });

      document.getElementById("keyboard").addEventListener("click", (e) => {
         if (this.game.gameState !== "playing") return;
         const key = e.target.getAttribute("data-key");
         if (!key) return;
         if (key === "ENTER") this.game.submitGuess();
         else if (key === "BACKSPACE") this.game.deleteLetter();
         else this.game.addLetter(key);
      });

      // Close popup
      document.getElementById("closePopup").addEventListener("click", () => {
         document.getElementById("endGamePopup").style.display = "none";
      });

      // Share button
      document.getElementById("shareButton").addEventListener("click", () => {
         this.shareResults();
      });
   }

   shareResults() {
      let shareText = `${this.game.gameConfig.name} ${this.game.guesses.length}/${this.game.maxGuesses}\n\n`;

      this.game.guesses.forEach((guess) => {
         guess.letters.forEach((letter) => {
            if (letter.state === "correct") {
               shareText += "🟩";
            } else if (letter.state === "present") {
               shareText += "🟨";
            } else if (letter.state === "mangle") {
               shareText += "🟧";
            } else if (letter.state === "hidden") {
               shareText += "⬜";
            } else {
               shareText += "⬛";
            }
         });
         shareText += "\n";
      });

      navigator.clipboard
         .writeText(shareText)
         .then(() => {
            this.showMessage("Copied to clipboard!");
         })
         .catch(() => {
            this.showMessage("Failed to copy");
         });
   }

   clearBoard() {
      for (let row = 0; row < this.game.maxGuesses; row++) {
         for (let col = 0; col < this.game.wordLength; col++) {
            const tile = document.getElementById(`tile-${row}-${col}`);
            if (tile) {
               tile.textContent = "";
               tile.className = "tile";
            }
         }
      }
   }

   clearKeyboard() {
      document.querySelectorAll("[data-key]").forEach((key) => {
         key.classList.remove("absent", "present", "correct", "mangle");
      });
   }
}
