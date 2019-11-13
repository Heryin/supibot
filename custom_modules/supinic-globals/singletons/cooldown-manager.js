/**
 *
 * @module CooldownManager
 */
/* global sb */
module.exports = (function (Module) {
	"use strict";

	/**
	 * Manages the cooldowns between each message sent to channels.
	 * @name sb.CooldownManager
	 * @type CooldownManager()
	 */
	return class CooldownManager extends Module {
		/**
		 * @inheritDoc
		 * @returns {CooldownManager}
		 */
		static singleton() {
			if (!CooldownManager.module) {
				CooldownManager.module = new CooldownManager();
			}
			return CooldownManager.module;
		}

		/**
		 * Creates a new Cooldown manager instance.
		 */
		constructor () {
			super();

			this.fallbackCooldown = 1500;
			// this.channelCooldowns = {
			// 	Write: 0, //sb.Config.get("CHANNEL_COOLDOWN_WRITE") / 2,
			// 	VIP: 0, // sb.Config.get("CHANNEL_COOLDOWN_VIP") / 2,
			// 	Moderator: 0 // sb.Config.get("CHANNEL_COOLDOWN_MODERATOR") / 2,
			// };

			/** @type {ManagerChannel[]} */
			this.channels = [];
		}

		/**
		 * Checks if a command, issued by user, in a given channel is ready to be sent.
		 * @param {ManagerCommand} command
		 * @param {ManagerUser} user
		 * @param {ManagerChannel} channel
		 * @returns {boolean}
		 */
		check (command, user, channel) {
			// Cooldown-immune users (aka mini-mods) are always given access
			if (user && user.Data && user.Data.cooldownImmunity) {
				return true;
			}

			const now = sb.Date.now();
			const targetChannel = this.channels.find(i => i.ID === channel.ID);
			if (!targetChannel) {
				this.addChannel(channel);
				return true;
			}
			else if (targetChannel.cooldown > now) {
				return false;
			}

			const targetUser = targetChannel.users.find(i => i.ID === user.ID);
			if (!targetUser) {
				return true;
			}

			const targetCommand = targetUser.commands.find(i => i.ID === command.ID);
			if (!targetCommand) {
				return true;
			}
			else if (targetCommand.cooldown > now) {
				return false;
			}

			return true;
		}

		/**
		 * Sets a cooldown for given command, user and channel.
		 * @param {ManagerCommand} command Invoked command
		 * @param {ManagerUser} user Invoking user
		 * @param {ManagerChannel} channel Channel the command was invoked in
		 */
		set (command, user, channel) {
			// If command cooldown is zero, do not apply the cooldown at all.
			if (command.Cooldown === 0) {
				return;
			}

			const targetChannel = this.channels.find(i => i.ID === channel.ID);
			if (!targetChannel || command.Read_Only || targetChannel.mode === "Inactive" || targetChannel.mode === "Read") {
				return;
			}

			let targetUser = targetChannel.users.find(i => i.ID === user.ID);
			if (!targetUser) {
				targetUser = {ID: user.ID, commands: []};
				targetChannel.users.push(targetUser);
			}

			let targetCommand = targetUser.commands.find(i => i.ID === command.ID);
			if (!targetCommand) {
				targetCommand = {ID: command.ID, cooldown: 0};
				targetUser.commands.push(targetCommand);
			}

			const now = sb.Date.now();
			targetCommand.cooldown = now + (command.Cooldown || this.fallbackCooldown);
		}

		/**
		 * Penalizes a user in one, or all channels with a two hour cooldown.
		 * This is done by faux-invoking a pseudo command with a long cooldown.
		 * @param {ManagerUser} user
		 * @param {ManagerChannel} [channel] If provided, penalizes the user in that channel. If not, penalizes them in all channels
		 */
		penalize (user, channel) {
			if (channel) {
				this.set(CooldownManager.penaltyPseudoCommand, user, channel);
			}
			else {
				for (const channel of this.channels) {
					this.set(CooldownManager.penaltyPseudoCommand, user, channel);
				}
			}
		}

		/**
		 * Dynamically add a channel.
		 * @param {ManagerChannel} channel
		 */
		addChannel (channel) {
			if (typeof channel.ID !== "number") {
				throw new Error("Channel ID must be provided and it must be a number");
			}

			this.channels.push({
				ID: channel.ID, mode: channel.Mode || "Write",
				users: []
			});
		}

		get modulePath () { return "cooldown-manager"; }

		/**
		 * Cleans up.
		 */
		destroy () {
			for (const channel of this.channels) {
				for (const user of channel.users) {
					user.commands = [];
				}
				channel.users = [];
			}
			this.channels = [];
		}

		/**
		 * Returns a pseudo-command, used to penalize a user - setting their cooldown for 2 hours
		 * @returns {{Cooldown: number, ID: number}}
		 */
		static get penaltyPseudoCommand () {
			return {ID: -1, Cooldown: 72.0e5};
		}
	};
});

/**
 * @typedef {Object} ManagerChannel
 * @property {number} ID Unique ID for given channel
 * @property {string} [Mode] The mode given channel operates in - Inactive, Read, Write, VIP, Moderator
 */

/**
 * @typedef {Object} ManagerCommand
 * @property {number} ID Unique ID for given command
 * @property {number} cooldown User-speciific cooldown, given in milliseconds
 * @property {boolean} [Read_Only=false] If true, no cooldowns will be impounded for using this command
 */

/**
 * @typedef {Object} ManagerUser
 * @property {number} ID Unique ID for given user
 */
