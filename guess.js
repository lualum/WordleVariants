export class Letter {
   constructor(character = "", state = "empty") {
      this.character = character.toUpperCase();
      this.state = state; // 'empty', 'filled', 'correct', 'present', 'absent', 'hidden', 'mangle'
      this.element = null;
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
      if (!this.element) return;

      this.element.textContent = this.character;
      this.element.className = "tile";

      if (this.state === "filled" || this.state === "empty") {
         if (this.character) {
            this.element.classList.add("filled");
         }
      } else {
         this.element.classList.add("filled", this.state);
      }
   }

   animateFlip() {
      if (!this.element) return;

      this.element.classList.add("flip");

      setTimeout(() => {
         this.element.classList.add(this.state);
      }, 300);
   }

   clear() {
      this.character = "";
      this.state = "empty";
      this.updateElement();
   }

   toJSON() {
      return {
         character: this.character,
         state: this.state,
      };
   }

   static fromJSON(data) {
      return new Letter(data.character, data.state);
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
      });
      return states;
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
         Letter.fromJSON(letterData)
      );
      guess.isComplete = data.isComplete;
      guess.isSubmitted = data.isSubmitted;
      return guess;
   }
}
