const NBA_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

module.exports = {
	Name: "nba",
	Aliases: null,
	Author: "supinic",
	Cooldown: 5000,
	Description: "Shows info related to upcoming NBA matches.",
	Flags: ["mention","pipe"],
	Params: null,
	Whitelist_Response: null,
	Static_Data: null,
	Code: async function nba () {
		const response = await sb.Got("GenericAPI", { url: NBA_URL });
		const event = response.body.events[0];
		if (!event) {
			return {
				success: false,
				reply: `No NBA event is currently scheduled!`
			};
		}

		let playedAtString = "";
		if (event.competitions[0]?.venue) {
			playedAtString = ` at ${event.competitions[0].venue.fullName}`;
		}

		let statusString = "";
		if (event.status && event.status.clock !== 0) {
			statusString = ` Period ${event.status.period}, ${event.status.displayClock}`;
		}

		let link = "";
		if (event.links) {
			const gamecast = event.links.find(i => i.text === "Gamecast");
			if (gamecast) {
				link = ` Gamecast: ${gamecast.href}`;
			}
		}

		const delta = sb.Utils.timeDelta(new sb.Date(event.date));
		return {
			reply: `Next match: ${event.name} ${delta}${playedAtString}.${statusString}${link}`
		};
	},
	Dynamic_Description: () => ([
		"Shows the closest upcoming NBA match."
	])
};
