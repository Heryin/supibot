module.exports = {
	Name: "stream-silence-prevention",
	Expression: "*/5 * * * * *",
	Description: "Makes sure that there is not a prolonged period of song request silence on Supinic's stream while live.",
	Defer: null,
	Type: "Bot",
	Code: (async function preventStreamSilence () {
		if (this.data.stopped) {
			return;
		}

		this.data.repeats ??= [];
		this.data.repeatsAmount ??= 100;

		// early return - avoid errors during modules loading
		if (!sb.Channel || !sb.Platform || !sb.VideoLANConnector) {
			return;
		}

		const twitch = sb.Platform.get("twitch");
		const cytube = sb.Platform.get("cytube");
		const channelData = sb.Channel.get("supinic", "twitch");
		const cytubeChannelData = sb.Channel.get(49);

		const streamData = await channelData.getStreamData();
		if (!streamData.live) {
			return;
		}

		const state = sb.Config.get("SONG_REQUESTS_STATE");
		if (state !== "vlc" && state !== "cytube") {
			return;
		}

		let isQueueEmpty = null;
		if (state === "vlc") {
			const queue = await sb.VideoLANConnector.getNormalizedPlaylist();
			isQueueEmpty = (queue.length === 0);
		}
		else if (state === "cytube") {
			isQueueEmpty = (cytube.controller.clients.get(cytubeChannelData.ID).playlistData.length === 0);
		}

		if (!isQueueEmpty) {
			return;
		}

		if (!this.data.videos) {
			// const playlistID = "PL9TsqVDcBIdtyegewA00JC0mlSkoq-VnJ"; // supinic's "stream playlist"
			const playlistID = "PL9gZzeM4mz7aySWRb0Hsl7Xbp3YCPg88l"; // "TOS Gachi and Cancer music FeelsGoodMan" by TeoTheParty
			// const playlistID = "PL9gZzeM4mz7bUF3LXcPRAU-7RFPa6NYqa"; // "Rare Gachi and Cancer HandsUp" by TeoTheParty
			const { result } = await sb.Utils.fetchYoutubePlaylist({
				key: sb.Config.get("API_GOOGLE_YOUTUBE"),
				playlistID
			});

			this.data.videos = result.map(i => i.ID);
		}

		let link;
		let videoID;
		const roll = sb.Utils.random(1, 3);
		if (roll === 1) {
			const videoData = await sb.Query.getRecordset(rs => rs
				.select("Link", "Video_Type")
				.from("personal", "Favourite_Track")
				.where("Link NOT IN %s+", this.data.repeats)
				.orderBy("RAND()")
				.limit(1)
				.single()
			);

			const prefix = await sb.Query.getRecordset(rs => rs
				.select("Link_Prefix")
				.from("data", "Video_Type")
				.where("ID = %n", videoData.Video_Type)
				.limit(1)
				.single()
				.flat("Link_Prefix")
			);

			videoID = videoData.Link;
			link = prefix.replace("$", videoData.Link);
		}
		else if (roll === 2) {
			const filtered = this.data.videos.filter(i => !this.data.repeats.includes(i));

			videoID = sb.Utils.randArray(filtered);
			link = `https://youtu.be/${videoID}`;
		}
		else if (roll === 3) {
			/** @type {string[]} */
			const links = await sb.Query.getRecordset(rs => rs
				.select("Track.Link AS Link")
				.from("music", "User_Favourite")
				.where("User_Alias = %n", 1)
				.where("Video_Type = %n", 1)
				.where(
					{ condition: this.data.repeats.length > 0 },
					"Track.Link NOT IN %s+",
					this.data.repeats
				)
				.join("music", "Track")
				.flat("Link")
			);

			videoID = sb.Utils.randArray(links);
			link = `https://youtu.be/${videoID}`;
		}

		// If there are no applicable video IDs, this means we ran out of possible videos.
		// Clear and abort this invocation
		if (!videoID) {
			this.data.repeats = [];
			return;
		}

		this.data.repeats.push(videoID);
		this.data.repeats.splice(0, this.data.repeats - this.data.repeatsAmount);

		if (state === "vlc") {
			const self = await sb.User.get("supibot");
			const sr = sb.Command.get("sr");

			const fakeContext = sb.Command.createFakeContext(sr, {
				user: self,
				channel: channelData,
				platform: twitch
			});

			await sr.execute(fakeContext, link);
			// result = commandResult.reply;
		}
		else if (state === "cytube") {
			const videoID = sb.Utils.modules.linkParser.parseLink(link);
			const client = cytube.controller.clients.get(cytubeChannelData.ID);

			// noinspection ES6MissingAwait
			client.queue("yt", videoID);
			// result = `Silence prevention! Successfully added ${link} to Cytube (hopefully).`;
		}

		// await channelData.send(result);
	})
};
