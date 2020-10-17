module.exports = {
	Name: "ping-supi",
	Events: ["message"],
	Description: "This module notifies Supinic whenever he is mentioned (in any channel, across platforms) via Twitch whispers.",
	Code: (async function (context) {
		const { message, channel, user } = context;
		const regex = /supi\b|supinic|bupi/i;
	
		if (typeof this.data.timeout === "undefined") {
			this.data.timeout = 0;
		}
		
		const now = sb.Date.now();
		if (now > this.data.timeout && regex.test(message) && !user.Data.skipGlobalPing) {
			this.data.timeout = now + 1000;
	
			const pingMessage = `[#${channel.Description ?? channel.Name}] ${user.Name}: ${message}`;
			await sb.Platform.get("twitch").pm(pingMessage, await sb.User.get("supinic"));
		}
	}),
	Author: "supinic"
};