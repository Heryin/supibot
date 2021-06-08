module.exports = {
	Name: "schedule",
	Aliases: null,
	Author: "supinic",
	Cooldown: 30000,
	Description: "Posts the channel's stream schedule.",
	Flags: ["external-input","mention","non-nullable","opt-out","pipe"],
	Params: null,
	Whitelist_Response: null,
	Static_Data: null,
	Code: (async function schedule (context, channel) {
		let channelName = null;
		if (channel) {
			channelName = channel;
		}
		else if (context.platform.Name === "twitch" && context.channel) {
			channelName = context.channel.Name;
		}

		if (!channelName) {
			return {
				success: false,
				reply: `No channel provided, and there is no default channel to be used!`
			};
		}

		const data = await sb.Got("Leppunen", `twitch/streamschedule/${channelName}`).json();
		if (data.status === 200 && data.nextStream) {
			let extra = "";
			if (data.interruption) {
				const { endAt, reason } = data.interruption;
				const end = new sb.Date(endAt);

				if (sb.Date.now() <= end) {
					extra = `Stream schedule is interrupted - reason: ${reason}, will be back ${sb.Utils.timeDelta(end)}.`;
				}
			}

			const game = (data.nextStream.game === "No game set")
				? "(no category)"
				: data.nextStream.game;

			const title = (data.nextStream.title === "")
				? "(no title)"
				: data.nextStream.title;

			let target = `${channelName}'s`;
			if (channelName.toLowerCase() === context.user.Name) {
				target = "Your";
				extra += " (shouldn't you know when you're supposed to stream? 😉)";
			}

			const channelID = await sb.Utils.getTwitchID(channelName);
			const liveData = await sb.Got("Kraken", `streams/${channelID}`).json();
			const isLive = Boolean(liveData.stream);

			let lateString = "";
			const nextStream = new sb.Date(data.nextStream.startsAt);
			if (!isLive && sb.Date.now() > nextStream) {
				const emote = await context.getBestAvailableEmote(["Weirdga", "WeirdChamp", "FeelsWeirdMan"], "🤨");
				lateString = `The stream seems to be late ${emote}`;
			}

			const time = sb.Utils.timeDelta(new sb.Date(data.nextStream.startsAt));
			return {
				reply: `${target} next stream: ${game} - ${title}, starting ${time}. ${lateString} ${extra}`
			};
		}
		else if (data.error) {
			return {
				reply: `User has not set a stream schedule.`
			};
		}
		else {
			console.warn("Unespected schedule result", data);
			return {
				success: false,
				reply: "Unexpected API result monkaS @leppunen @supinic"
			};
		}
	}),
	Dynamic_Description: null
};
