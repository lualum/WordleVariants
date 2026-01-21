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

      const isDuodle = this.game.gameType === "duodle";

      if (isDuodle) {
         // Create container for two boards
         const boardsContainer = document.createElement("div");
         boardsContainer.style.display = "flex";
         boardsContainer.style.gap = "2vmin";
         boardsContainer.style.justifyContent = "center";

         // Create first board
         const board1 = document.createElement("div");
         board1.id = "board1";
         board1.style.display = "flex";
         board1.style.flexDirection = "column";
         board1.style.gap = "0.7vmin";

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
            board1.appendChild(rowElement);
         }

         // Create second board
         const board2 = document.createElement("div");
         board2.id = "board2";
         board2.style.display = "flex";
         board2.style.flexDirection = "column";
         board2.style.gap = "0.7vmin";

         for (let row = 0; row < this.game.maxGuesses; row++) {
            const rowElement = document.createElement("div");
            rowElement.className = "row";
            rowElement.id = `row2-${row}`;
            for (let col = 0; col < this.game.wordLength; col++) {
               const tile = document.createElement("div");
               tile.className = "tile";
               tile.id = `tile2-${row}-${col}`;
               rowElement.appendChild(tile);
            }
            board2.appendChild(rowElement);
         }

         boardsContainer.appendChild(board1);
         boardsContainer.appendChild(board2);
         boardElement.appendChild(boardsContainer);
      } else {
         // Single board for other game types
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
   }

   bindGuessToRow(guess, rowIndex) {
      const rowElement = document.getElementById(`row-${rowIndex}`);
      guess.rowElement = rowElement;
      guess.rowIndex = rowIndex;

      const isDuodle = this.game.gameType === "duodle";

      // Check if boards were found BEFORE this guess (not including this guess)
      const wasWord1FoundBefore =
         isDuodle && this.wasWordFoundBeforeGuess(1, rowIndex);
      const wasWord2FoundBefore =
         isDuodle && this.wasWordFoundBeforeGuess(2, rowIndex);

      guess.letters.forEach((letter, colIndex) => {
         const tile = document.getElementById(`tile-${rowIndex}-${colIndex}`);

         // Save existing classes before updating
         const hadGamblePreview =
            tile && tile.classList.contains("gamble-preview");

         // Bind element if word 1 hasn't been found yet, or if this is a submitted guess
         if (!wasWord1FoundBefore || guess.isSubmitted) {
            letter.element = tile;
            letter.updateElement();

            // Restore gamble preview if it was there
            if (hadGamblePreview) {
               tile.classList.add("gamble-preview");
            }
         } else {
            // Don't bind element if word 1 was already found
            letter.element = null;
         }

         // Duodle: bind second board tiles to the same letter
         if (isDuodle) {
            const tile2 = document.getElementById(
               `tile2-${rowIndex}-${colIndex}`,
            );

            // Bind element2 if word 2 hasn't been found yet, or if this is a submitted guess
            if (tile2 && (!wasWord2FoundBefore || guess.isSubmitted)) {
               letter.element2 = tile2;
               letter.skipElement2Update = false;

               // Update second tile
               tile2.textContent = letter.character;
               tile2.className = "tile";
               if (letter.character) {
                  tile2.classList.add("filled");
               }
               if (letter.state2) {
                  tile2.classList.add(letter.state2);
               }
            } else {
               // Don't bind element2 if word was already found
               letter.element2 = null;
               letter.skipElement2Update = true;
            }
         }
      });

      // For the current active guess, also check current completion status
      if (!guess.isSubmitted && isDuodle) {
         guess.letters.forEach((letter, colIndex) => {
            // If word 1 is currently found and this is the active row, don't bind
            if (
               this.game.duodleWord1Found &&
               rowIndex === this.game.guesses.length
            ) {
               letter.element = null;
            }
            // If word 2 is currently found and this is the active row, don't bind element2
            if (
               this.game.duodleWord2Found &&
               rowIndex === this.game.guesses.length
            ) {
               letter.element2 = null;
               letter.skipElement2Update = true;
            }
         });
      }
   }

   wasWordFoundBeforeGuess(wordNumber, guessIndex) {
      if (this.game.gameType !== "duodle") return false;

      // Check all previous guesses (not including the current guess at guessIndex)
      for (let i = 0; i < guessIndex && i < this.game.guesses.length; i++) {
         const guess = this.game.guesses[i];
         const word = guess.getWord();

         if (wordNumber === 1 && word === this.game.targetWord) {
            return true;
         }
         if (wordNumber === 2 && word === this.game.targetWord2) {
            return true;
         }
      }

      return false;
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
         // Apply gamble preview on restore
         if (
            this.game.gameType === "gamble" &&
            this.game.gameState === "playing"
         ) {
            this.applyGamblePreview();
         }
      }

      // Restore grayed out boards for Duodle
      if (this.game.gameType === "duodle") {
         if (this.game.duodleWord1Found) {
            this.grayOutBoard(1);
         }
         if (this.game.duodleWord2Found) {
            this.grayOutBoard(2);
         }
      }

      if (this.game.gameState === "won") {
         setTimeout(() => this.showEndGamePopup(), 500);
      } else if (this.game.gameState === "lost") {
         setTimeout(() => this.showEndGamePopup(), 500);
      }
   }

   applyGamblePreview() {
      if (
         this.game.gameType === "gamble" &&
         this.game.gambleNextHiddenIndex !== null &&
         this.game.gameState === "playing"
      ) {
         const rowIndex = this.game.guesses.length;
         const previewTile = document.getElementById(
            `tile-${rowIndex}-${this.game.gambleNextHiddenIndex}`,
         );
         if (previewTile) {
            previewTile.classList.add("gamble-preview");
         }
      }
   }

   grayOutBoard(boardNumber) {
      // Apply gray overlay to completed board
      const boardId = boardNumber === 1 ? "board1" : "board2";
      const board = document.getElementById(boardId);

      if (board) {
         board.classList.add("completed");
      }
   }

   updateKeyboardFromGuess(guess) {
      const isDuodle = this.game.gameType === "duodle";

      if (isDuodle) {
         const { states, states2 } = guess.getLetterStates();

         for (const [letter, state] of Object.entries(states)) {
            const key = document.querySelector(`[data-key="${letter}"]`);
            if (key) {
               const state2 = states2[letter] || state;

               // Remove old classes
               key.classList.remove(
                  "correct",
                  "present",
                  "absent",
                  "duodle-split",
               );

               // If both states are the same, use single color
               if (state === state2) {
                  key.classList.add(state);
               } else {
                  // Use split diagonal design
                  key.classList.add("duodle-split");
                  key.setAttribute("data-state1", state);
                  key.setAttribute("data-state2", state2);
               }
            }
         }
      } else {
         const letterStates =
            guess.getLetterStates().states || guess.getLetterStates();
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
         if (this.game.gameType === "duodle") {
            let missedWords = [];
            if (!this.game.duodleWord1Found)
               missedWords.push(this.game.targetWord);
            if (!this.game.duodleWord2Found)
               missedWords.push(this.game.targetWord2);

            if (missedWords.length === 2) {
               resultText.textContent = `The words were: ${missedWords[0]} & ${missedWords[1]}`;
            } else {
               resultText.textContent = `You found one! Missing: ${missedWords[0]}`;
            }
         } else {
            resultText.textContent = `The word was: ${this.game.targetWord}`;
         }
      }

      // Set guess count
      guessCount.textContent = `${this.game.guesses.length}/${this.game.maxGuesses}`;

      // Create board preview
      boardPreview.innerHTML = "";

      const isDuodle = this.game.gameType === "duodle";

      if (isDuodle) {
         // Create container for both previews
         const previewContainer = document.createElement("div");
         previewContainer.style.display = "flex";
         previewContainer.style.gap = "2vmin";
         previewContainer.style.position = "relative";

         // First board preview
         const preview1Container = document.createElement("div");
         preview1Container.style.position = "relative";

         const preview1 = document.createElement("div");
         preview1.className = "board-preview";
         if (this.game.duodleWord1Found) {
            preview1.style.opacity = "0.6";
         }

         this.game.guesses.forEach((guess) => {
            const rowDiv = document.createElement("div");
            rowDiv.className = "preview-row";

            guess.letters.forEach((letter) => {
               const tileDiv = document.createElement("div");
               tileDiv.className = `preview-tile ${letter.state}`;
               rowDiv.appendChild(tileDiv);
            });

            preview1.appendChild(rowDiv);
         });

         preview1Container.appendChild(preview1);

         // Second board preview
         const preview2Container = document.createElement("div");
         preview2Container.style.position = "relative";

         const preview2 = document.createElement("div");
         preview2.className = "board-preview";
         if (this.game.duodleWord2Found) {
            preview2.style.opacity = "0.6";
         }

         this.game.guesses.forEach((guess) => {
            const rowDiv = document.createElement("div");
            rowDiv.className = "preview-row";

            guess.letters.forEach((letter) => {
               const tileDiv = document.createElement("div");
               tileDiv.className = `preview-tile ${letter.state2 || letter.state}`;
               rowDiv.appendChild(tileDiv);
            });

            preview2.appendChild(rowDiv);
         });

         preview2Container.appendChild(preview2);

         previewContainer.appendChild(preview1Container);
         previewContainer.appendChild(preview2Container);
         boardPreview.appendChild(previewContainer);
      } else {
         // Single board preview
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
      }

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
      const isDuodle = this.game.gameType === "duodle";

      let shareText = `${this.game.gameConfig.name} ${this.game.guesses.length}/${this.game.maxGuesses}\n`;

      shareText += "\n";

      if (isDuodle) {
         // Show both boards side by side
         this.game.guesses.forEach((guess) => {
            // Board 1
            guess.letters.forEach((letter) => {
               if (letter.state === "correct") {
                  shareText += "🟩";
               } else if (letter.state === "present") {
                  shareText += "🟨";
               } else if (letter.state === "mangle") {
                  shareText += "🟧";
               } else if (letter.state === "hidden") {
                  shareText += "⬜";
               } else if (letter.state === "empty") {
                  shareText += "⬛"; // Gray for completed board
               } else {
                  shareText += "⬛";
               }
            });

            shareText += "  ";

            // Board 2
            guess.letters.forEach((letter) => {
               const state = letter.state2 || letter.state;
               if (state === "correct") {
                  shareText += "🟩";
               } else if (state === "present") {
                  shareText += "🟨";
               } else if (state === "mangle") {
                  shareText += "🟧";
               } else if (state === "hidden") {
                  shareText += "⬜";
               } else if (state === "empty") {
                  shareText += "⬛"; // Gray for completed board
               } else {
                  shareText += "⬛";
               }
            });

            shareText += "\n";
         });
      } else {
         // Single board
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
      }

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
      const isDuodle = this.game.gameType === "duodle";

      for (let row = 0; row < this.game.maxGuesses; row++) {
         for (let col = 0; col < this.game.wordLength; col++) {
            const tile = document.getElementById(`tile-${row}-${col}`);
            if (tile) {
               tile.textContent = "";
               tile.className = "tile";
            }

            if (isDuodle) {
               const tile2 = document.getElementById(`tile2-${row}-${col}`);
               if (tile2) {
                  tile2.textContent = "";
                  tile2.className = "tile";
               }
            }
         }
      }
   }

   clearKeyboard() {
      document.querySelectorAll("[data-key]").forEach((key) => {
         key.classList.remove(
            "absent",
            "present",
            "correct",
            "mangle",
            "duodle-split",
         );
         key.removeAttribute("data-state1");
         key.removeAttribute("data-state2");
      });
   }
}
