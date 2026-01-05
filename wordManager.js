export class WordManager {
   constructor() {
      this.wordList = [];
      this.answerList = [];
      this.yellodleAnswers = [];
      this.fourLetterWords = [];
      this.fourLetterAnswers = [];
   }

   async loadWords() {
      try {
         const promises = [
            fetch("words.json").then((r) => r.json()),
            fetch("answers.json").then((r) => r.json()),
            fetch("yellodleAnswers.json")
               .then((r) => r.json())
               .catch(() => []),
            fetch("fourLetterWords.json")
               .then((r) => r.json())
               .catch(() => []),
            fetch("fourLetterAnswers.json")
               .then((r) => r.json())
               .catch(() => []),
         ];

         const [
            words,
            answers,
            yellodleAnswers,
            fourLetterWords,
            fourLetterAnswers,
         ] = await Promise.all(promises);

         this.wordList = words.map((word) => word.toUpperCase());
         this.answerList = answers.map((word) => word.toUpperCase());
         this.yellodleAnswers = yellodleAnswers.map((word) =>
            word.toUpperCase()
         );
         this.fourLetterWords = fourLetterWords.map((word) =>
            word.toUpperCase()
         );
         this.fourLetterAnswers = fourLetterAnswers.map((word) =>
            word.toUpperCase()
         );
      } catch (error) {
         console.error("Error loading words:", error);
         alert(
            "Error loading word files. Please ensure all word files are available."
         );
      }
   }

   hashDate(date) {
      const dateString = date.toISOString().split("T")[0]; // YYYY-MM-DD
      let hash = 0;
      for (let i = 0; i < dateString.length; i++) {
         const char = dateString.charCodeAt(i);
         hash = (hash << 5) - hash + char;
         hash |= 0; // Convert to 32bit integer
      }
      return Math.abs(hash);
   }

   getDailyWord(gameType, wordLength = 5) {
      const hash = this.hashDate(new Date());

      let answerList = this.answerList;

      if (gameType === "yellodle" && this.yellodleAnswers.length > 0) {
         answerList = this.yellodleAnswers;
      } else if (wordLength === 4 && this.fourLetterAnswers.length > 0) {
         answerList = this.fourLetterAnswers;
      }

      const index = hash % answerList.length;
      return answerList[index].toUpperCase();
   }

   isValidWord(word, wordLength = 5) {
      if (wordLength === 4) {
         return (
            this.fourLetterWords.includes(word) ||
            this.fourLetterAnswers.includes(word)
         );
      }
      return this.wordList.includes(word);
   }
}
