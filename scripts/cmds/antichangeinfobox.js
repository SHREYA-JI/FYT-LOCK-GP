const { getStreamFromURL, uploadImgbb } = global.utils;

module.exports = {
  config: {
    name: "antichangeinfobox",
    version: "1.6-fixed",
    author: "NTKhang + Fixed by Smart Shankar",
    countDown: 10,
    role: 2,
    shortDescription: {
      vi: "Chống đổi thông tin box chat",
      en: "Anti change info box"
    },
    longDescription: {
      vi: "Bật tắt chức năng chống thành viên đổi thông tin box chat của bạn",
      en: "Turn on/off anti change info box"
    },
    category: "box chat",
    guide: {
      en:
        "   {pn} avt [on | off]: anti change avatar\n" +
        "   {pn} name [on | off]: anti change name\n" +
        "   {pn} nickname [on | off]: anti change nickname\n" +
        "   {pn} theme [on | off]: anti change theme\n" +
        "   {pn} emoji [on | off]: anti change emoji"
    }
  },

  langs: {
    en: {
      antiChangeAvatarOn: "Group avatar locked ✅",
      antiChangeAvatarOff: "Group avatar lock removed ❎",
      missingAvt: "No avatar set for this group!",
      antiChangeNameOn: "Group name locked ✅",
      antiChangeNameOff: "Group name lock removed ❎",
      antiChangeNicknameOn: "Nicknames locked ✅",
      antiChangeNicknameOff: "Nicknames lock removed ❎",
      antiChangeThemeOn: "Theme locked ✅",
      antiChangeThemeOff: "Theme lock removed ❎",
      antiChangeEmojiOn: "Emoji locked ✅",
      antiChangeEmojiOff: "Emoji lock removed ❎",
      antiChangeAvatarAlreadyOn: " ",
      antiChangeNameAlreadyOn: " ",
      antiChangeNicknameAlreadyOn: " ",
      antiChangeThemeAlreadyOn: " ",
      antiChangeEmojiAlreadyOn: " "
    }
  },

  onStart: async function ({ message, event, args, threadsData, getLang }) {
    if (!["on", "off"].includes(args[1]))
      return message.SyntaxError();

    const { threadID } = event;
    const dataAntiChangeInfoBox = await threadsData.get(threadID, "data.antiChangeInfoBox", {});

    async function checkAndSaveData(key, data) {
      if (args[1] === "off")
        delete dataAntiChangeInfoBox[key];
      else
        dataAntiChangeInfoBox[key] = data;

      await threadsData.set(threadID, dataAntiChangeInfoBox, "data.antiChangeInfoBox");
      message.reply(getLang(`antiChange${key[0].toUpperCase()}${key.slice(1)}${args[1][0].toUpperCase()}${args[1].slice(1)}`));
    }

    switch (args[0]) {
      case "avt":
      case "avatar": {
        const { imageSrc } = await threadsData.get(threadID);
        if (!imageSrc)
          return message.reply(getLang("missingAvt"));
        const newImageSrc = await uploadImgbb(imageSrc);
        await checkAndSaveData("avatar", newImageSrc.image.url);
        break;
      }
      case "name": {
        const { threadName } = await threadsData.get(threadID);
        await checkAndSaveData("name", threadName);
        break;
      }
      case "nickname": {
        const { members } = await threadsData.get(threadID);
        const nicknames = members.reduce((acc, user) => {
          acc[user.userID] = user.nickname;
          return acc;
        }, {});
        await checkAndSaveData("nickname", nicknames);
        break;
      }
      case "theme": {
        const { threadThemeID } = await threadsData.get(threadID);
        await checkAndSaveData("theme", threadThemeID);
        break;
      }
      case "emoji": {
        const { emoji } = await threadsData.get(threadID);
        await checkAndSaveData("emoji", emoji);
        break;
      }
      default: {
        return message.SyntaxError();
      }
    }
  },

  onEvent: async function ({ message, event, threadsData, role, api, getLang }) {
    const { threadID, logMessageType, logMessageData, author } = event;
    const dataAntiChange = await threadsData.get(threadID, "data.antiChangeInfoBox", {});

    switch (logMessageType) {
      case "log:thread-image": {
        if (!dataAntiChange.avatar)
          return;
        if (role < 2 && api.getCurrentUserID() !== author) {
          message.reply(getLang("antiChangeAvatarAlreadyOn"));
          await api.changeGroupImage(await getStreamFromURL(dataAntiChange.avatar), threadID);
        } else {
          const imageSrc = logMessageData.url;
          const newImageSrc = await uploadImgbb(imageSrc);
          await threadsData.set(threadID, newImageSrc.image.url, "data.antiChangeInfoBox.avatar");
        }
        break;
      }

      case "log:thread-name": {
        if (!dataAntiChange.name)
          return;
        if (role < 2 && api.getCurrentUserID() !== author) {
          message.reply(getLang("antiChangeNameAlreadyOn"));
          await api.setTitle(dataAntiChange.name, threadID);
        } else {
          await threadsData.set(threadID, logMessageData.name, "data.antiChangeInfoBox.name");
        }
        break;
      }

      case "log:user-nickname": {
        if (!dataAntiChange.nickname)
          return;
        const { participant_id, nickname } = logMessageData;
        if (role < 2 && api.getCurrentUserID() !== author) {
          message.reply(getLang("antiChangeNicknameAlreadyOn"));
          await api.changeNickname(dataAntiChange.nickname[participant_id], threadID, participant_id);
        } else {
          await threadsData.set(threadID, nickname, `data.antiChangeInfoBox.nickname.${participant_id}`);
        }
        break;
      }

      case "log:thread-color": {
        if (!dataAntiChange.theme)
          return;
        if (role < 2 && api.getCurrentUserID() !== author) {
          message.reply(getLang("antiChangeThemeAlreadyOn"));
          await api.changeThreadColor(dataAntiChange.theme, threadID);
        } else {
          await threadsData.set(threadID, logMessageData.theme_id, "data.antiChangeInfoBox.theme");
        }
        break;
      }

      case "log:thread-icon": {
        if (!dataAntiChange.emoji)
          return;
        if (role < 2 && api.getCurrentUserID() !== author) {
          message.reply(getLang("antiChangeEmojiAlreadyOn"));
          await api.changeThreadEmoji(dataAntiChange.emoji, threadID);
        } else {
          await threadsData.set(threadID, logMessageData.thread_icon, "data.antiChangeInfoBox.emoji");
        }
        break;
      }
    }
  }
};
