export const GameTypes = {
	FAKELE: "fakele",
	CHAINDLE: "chaindle",
	YELLODLE: "yellodle",
	GAMBLE: "gamble",
	ODDSLE: "oddsle",
	DUODLE: "duodle",
	REPEADLE: "repeadle",
};

export const GameTypeConfig = {
	[GameTypes.FAKELE]: {
		name: "Fakele",
		description: "One letter is fake!",
		maxGuesses: 7,
		wordLength: 5,
		dayOfWeek: 1, // Monday
	},
	[GameTypes.CHAINDLE]: {
		name: "Chaindle",
		description: "Start each guess with the previous guess's last letter!",
		maxGuesses: 7,
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
	[GameTypes.DUODLE]: {
		name: "Duodle",
		description: "Two words at once!",
		maxGuesses: 7,
		wordLength: 5,
		dayOfWeek: 5, // Saturday
	},
	[GameTypes.ODDSLE]: {
		name: "Oddsle",
		description: "Two random guesses already filled in!",
		maxGuesses: 7,
		wordLength: 5,
		dayOfWeek: 6, // Friday
	},
	[GameTypes.REPEADLE]: {
		name: "Repeadle",
		description: "Do not use letters from your previous guess!",
		maxGuesses: 6,
		wordLength: 5,
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
