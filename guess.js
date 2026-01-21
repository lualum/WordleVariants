export class Letter {
   constructor(character = "", state = "empty") {
      this.character = character.toUpperCase();
      this.state = state; // 'empty', 'filled', 'correct', 'present', 'absent', 'hidden', 'mangle'
      this.state2 = null; // For Duodle second word
      this.element = null;
      this.element2 = null; // For Duodle second board
      this.skipElement2Update = false; // Flag to skip updating element2
   }

   setCharacter(character) {
      this.character = character.toUpperCase();
      this.state = this.character ? "filled" : "empty";
      this.updateElement();
   }

   setState(state) {
      this.state = state;
   }

   updateElement() {
      // Update first element only if it exists
      if (this.element) {
         // Save gamble-preview class if it exists
         const hadGamblePreview =
            this.element.classList.contains("gamble-preview");

         this.element.textContent = this.character;
         this.element.className = "tile";

         if (this.state === "filled" || this.state === "empty") {
            if (this.character) {
               this.element.classList.add("filled");
            }
         } else {
            this.element.classList.add("filled", this.state);
         }

         // Restore gamble-preview class
         if (hadGamblePreview) {
            this.element.classList.add("gamble-preview");
         }
      }

      // Update second element for Duodle only if not skipped
      if (this.element2 && !this.skipElement2Update) {
         this.element2.textContent = this.character;
         this.element2.className = "tile";

         if (
            this.state2 === "filled" ||
            this.state2 === "empty" ||
            !this.state2
         ) {
            if (this.character) {
               this.element2.classList.add("filled");
            }
         } else {
            this.element2.classList.add("filled", this.state2);
         }
      }
   }

   animateFlip() {
      // Animate first element only if it exists
      if (this.element) {
         this.element.classList.add("flip");

         setTimeout(() => {
            this.element.classList.add(this.state);
         }, 300);
      }

      // Animate second element for Duodle only if not skipped
      if (this.element2 && !this.skipElement2Update) {
         this.element2.classList.add("flip");

         setTimeout(() => {
            if (this.state2) {
               this.element2.classList.add(this.state2);
            }
         }, 300);
      }
   }

   clear() {
      this.character = "";
      this.state = "empty";
      this.state2 = null;
      this.updateElement();
   }

   toJSON() {
      return {
         character: this.character,
         state: this.state,
         state2: this.state2,
      };
   }

   static fromJSON(data) {
      const letter = new Letter(data.character, data.state);
      letter.state2 = data.state2 || null;
      return letter;
   }
}

export class Guess {
   constructor(wordLength = 5) {
      this.wordLength = wordLength;
      this.letters = Array(wordLength)
         .fill(null)
         .map(() => new Letter());
      this.isComplete = false;
      this.isSubmitted = false;
      this.rowElement = null;
      this.rowIndex = -1;
   }

   addLetter(character, position) {
      if (position >= 0 && position < this.wordLength) {
         this.letters[position].setCharacter(character);
         this.updateCompletionStatus();
      }
   }

   removeLetter(position) {
      if (position >= 0 && position < this.wordLength) {
         this.letters[position].clear();
         this.updateCompletionStatus();
      }
   }

   updateCompletionStatus() {
      this.isComplete = this.letters.every((letter) => letter.character !== "");
   }

   getWord() {
      return this.letters.map((letter) => letter.character).join("");
   }

   evaluateAgainst(targetWord) {
      const word = this.getWord();
      const targetLetters = targetWord.split("");
      const guessLetters = word.split("");

      // First pass: mark correct letters
      for (let i = 0; i < this.wordLength; i++) {
         if (guessLetters[i] === targetLetters[i]) {
            this.letters[i].setState("correct");
            targetLetters[i] = null;
            guessLetters[i] = null;
         }
      }

      // Second pass: mark present letters
      for (let i = 0; i < this.wordLength; i++) {
         if (guessLetters[i] && targetLetters.includes(guessLetters[i])) {
            this.letters[i].setState("present");
            const targetIndex = targetLetters.indexOf(guessLetters[i]);
            targetLetters[targetIndex] = null;
         } else if (guessLetters[i]) {
            this.letters[i].setState("absent");
         }
      }

      this.isSubmitted = true;
   }

   animateReveal() {
      this.letters.forEach((letter, index) => {
         setTimeout(() => {
            letter.animateFlip();
         }, index * 300);
      });
   }

   restoreVisualState() {
      this.letters.forEach((letter) => {
         letter.updateElement();
      });
   }

   getLetterStates() {
      const states = {};
      const states2 = {};

      this.letters.forEach((letter) => {
         if (
            letter.character &&
            letter.state !== "empty" &&
            letter.state !== "filled" &&
            letter.state !== "hidden"
         ) {
            if (
               !states[letter.character] ||
               letter.state === "correct" ||
               (letter.state === "present" &&
                  states[letter.character] === "absent")
            ) {
               states[letter.character] = letter.state;
            }
         }

         // Handle state2 for Duodle
         if (
            letter.character &&
            letter.state2 &&
            letter.state2 !== "empty" &&
            letter.state2 !== "filled" &&
            letter.state2 !== "hidden"
         ) {
            if (
               !states2[letter.character] ||
               letter.state2 === "correct" ||
               (letter.state2 === "present" &&
                  states2[letter.character] === "absent")
            ) {
               states2[letter.character] = letter.state2;
            }
         }
      });

      return { states, states2 };
   }

   toJSON() {
      return {
         letters: this.letters.map((letter) => letter.toJSON()),
         isComplete: this.isComplete,
         isSubmitted: this.isSubmitted,
         wordLength: this.wordLength,
      };
   }

   static fromJSON(data) {
      const guess = new Guess(data.wordLength || 5);
      guess.letters = data.letters.map((letterData) =>
         Letter.fromJSON(letterData),
      );
      guess.isComplete = data.isComplete;
      guess.isSubmitted = data.isSubmitted;
      return guess;
   }
}
