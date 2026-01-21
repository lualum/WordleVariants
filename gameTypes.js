export const GameTypes = {
   FAKELE: "fakele",
   HARDLE: "hardle",
   YELLODLE: "yellodle",
   GAMBLE: "gamble",
   MANGLE: "mangle",
   DUODLE: "duodle",
   FOURLE: "fourle",
};

export const GameTypeConfig = {
   [GameTypes.FAKELE]: {
      name: "Fakele",
      description: "One letter is fake!",
      maxGuesses: 7,
      wordLength: 5,
      dayOfWeek: 1, // Monday
   },
   [GameTypes.HARDLE]: {
      name: "Hardle",
      description: "Revealed hints must be used!",
      maxGuesses: 6,
      wordLength: 5,
      dayOfWeek: 2, // Tuesday
   },
   [GameTypes.YELLODLE]: {
      name: "Yellodle",
      description: "Win when all letters are yellow!",
      maxGuesses: 6,
      wordLength: 5,
      dayOfWeek: 3, // Wednesday
   },
   [GameTypes.GAMBLE]: {
      name: "Gamble",
      description: "One random letter gives no info!",
      maxGuesses: 7,
      wordLength: 5,
      dayOfWeek: 4, // Thursday
   },
   [GameTypes.MANGLE]: {
      name: "Mangle",
      description: "Green and yellow appear the same!",
      maxGuesses: 7,
      wordLength: 5,
      dayOfWeek: 5, // Friday
   },
   [GameTypes.DUODLE]: {
      name: "Duodle",
      description: "Two words at once!",
      maxGuesses: 7,
      wordLength: 5,
      dayOfWeek: 6, // Saturday
   },
   [GameTypes.FOURLE]: {
      name: "Fourle",
      description: "Four letter words!",
      maxGuesses: 6,
      wordLength: 4,
      dayOfWeek: 0, // Sunday
   },
};

export function getGameTypeForDate(date) {
   const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

   for (const [type, config] of Object.entries(GameTypeConfig)) {
      if (config.dayOfWeek === dayOfWeek) {
         return type;
      }
   }

   return GameTypes.NORMAL;
}
