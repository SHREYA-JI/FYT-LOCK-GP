const fs = require("fs-extra");
const path = require("path");

const autoSetnamePath = path.join(__dirname, "../data/setnameAuto.json");

// Shortcut replace
async function checkShortCut(nickname, uid, usersData) {
	try {
		if (/\{userName\}/gi.test(nickname))
			nickname = nickname.replace(/\{userName\}/gi, await usersData.getName(uid));
		if (/\{userID\}/gi.test(nickname))
			nickname = nickname.replace(/\{userID\}/gi, uid);
		return nickname;
	} catch (e) {
		return nickname;
	}
}

module.exports = {
	config: {
		name: "setname",
		version: "2.0",
		author: "NTKhang + ChatGPT",
		countDown: 5,
		role: 0,
		description: {
			en: "Change nickname of all members or auto-change new members",
		},
		category: "box chat",
		guide: {
			en: "   {pn} <nickname>: Change your nickname\n"
				+ "   {pn} @tags <nickname>: Change nickname of tagged members\n"
				+ "   {pn} all <nickname>: Change nickname of all members and auto-set for new ones\n"
				+ "   {pn} stop: Stop auto-changing nickname in this group\n\n"
				+ "Shortcuts:\n"
				+ "   {userName}: Member's name\n"
				+ "   {userID}: Member's ID"
		}
	},

	langs: {
		en: {
			error: "An error occurred, try again later.",
			stopped: "✅ Auto nickname change has been disabled for this group.",
			started: "✅ Auto nickname change is now enabled for this group.",
		}
	},

	onStart: async function ({ args, message, event, api, usersData, getLang }) {
		await fs.ensureFile(autoSetnamePath);
		let data = {};
		if (fs.existsSync(autoSetnamePath))
			data = JSON.parse(fs.readFileSync(autoSetnamePath));

		if (!args[0]) return message.reply("Please provide arguments.");

		// Stop auto-change
		if (args[0].toLowerCase() === "stop") {
			delete data[event.threadID];
			fs.writeFileSync(autoSetnamePath, JSON.stringify(data, null, 2));
			return message.reply(getLang("stopped"));
		}

		const mentions = Object.keys(event.mentions);
		let uids = [];
		let nickname = args.join(" ");

		if (args[0] === "all") {
			uids = (await api.getThreadInfo(event.threadID)).participantIDs;
			nickname = args.slice(1).join(" ").trim();

			// Save auto-change config
			data[event.threadID] = nickname;
			fs.writeFileSync(autoSetnamePath, JSON.stringify(data, null, 2));
			message.reply(getLang("started"));
		}
		else if (mentions.length) {
			uids = mentions;
			const allName = new RegExp(
				Object.values(event.mentions)
					.map(name => name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"))
					.join("|")
				, "g"
			);
			nickname = nickname.replace(allName, "").trim();
		}
		else {
			uids = [event.senderID];
			nickname = nickname.trim();
		}

		try {
			for (const uid of uids)
				await api.changeNickname(await checkShortCut(nickname, uid, usersData), event.threadID, uid);
		}
		catch (e) {
			console.error(e);
			return message.reply(getLang("error"));
		}
	},

	// Event listener for new members
	onEvent: async function ({ event, api, usersData }) {
		if (event.logMessageType !== "log:subscribe") return;
		if (!fs.existsSync(autoSetnamePath)) return;

		const data = JSON.parse(fs.readFileSync(autoSetnamePath));
		const nicknameFormat = data[event.threadID];
		if (!nicknameFormat) return;

		for (const newMember of event.logMessageData.addedParticipants) {
			const uid = newMember.userFbId;
			try {
				const nickname = await checkShortCut(nicknameFormat, uid, usersData);
				await api.changeNickname(nickname, event.threadID, uid);
			}
			catch (e) {
				console.error(e);
			}
		}
	}
};
