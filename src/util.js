import { RichEmbed } from 'discord.js';
import { colors, defInline, vaebId, noChar } from './setup';

String.prototype.toTitleCase = function toTitleCaseFunc() {
    return this.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

export const print = (channel, ...args) => channel.send(args.join(' '), { split: true });

export const printLog = (channel, ...args) => {
    console.log(...args);
    if (channel) return print(channel, ...args);
    return null;
};

export const onError = (err, context = 'Unspecified', noLog) => {
    const errContext = `[ Caught_${context} ]`;

    if (!noLog) return console.log(`[ Caught_${context} ]`, err);

    return errContext;
};

export const sendEmbed = (channel, {
    title = '', desc = '', footer = '', color = colors.pink, fields = [], image,
}) => {
    if (typeof color === 'string') color = colors[color];

    const embed = new RichEmbed()
        .setTitle(title)
        .setDescription(desc)
        .setFooter(footer)
        .setThumbnail(image)
        .setColor(color);

    for (let i = 0; i < fields.length; i++) {
        let field = fields[i];

        if (typeof field === 'string') field = { name: '​', value: field, inline: defInline };

        if (field.value == null) field.value = noChar;

        embed.addField(field.name, field.value, field.inline == null ? defInline : field.inline);
    }

    channel.send(embed);
};

export const sendEmbedError = (channel, desc) =>
    sendEmbed(channel, {
        title: 'Command Error',
        desc,
        color: colors.red,
    });

export const globalRegex = (str, rgx) => {
    const out = [];
    let match;

    while ((match = rgx.exec(str))) {
        const newMatch = [];

        for (let i = 1; i < match.length; i++) {
            newMatch.push(match[i]);
        }

        newMatch.cap = match[0];

        out.push(newMatch);
    }

    return out;
};

export const isArray = obj => !!obj && obj.constructor === Array;

export const cloneDeepJson = obj => JSON.parse(JSON.stringify(obj));

export const cloneDeepArray = arr => arr.map(val => (isArray(val) ? cloneDeepArray(val) : val));

export const matchWholeNumberRegex = /^\d*(?:\.\d+)?$/;

export const matchWholeNumber = str => (str.match(matchWholeNumberRegex) || [])[0];

export const getBaseMuteTime = member => String(member).length;

export const isMember = userRes => userRes.user != null;

export const getDiscriminatorFromName = (name) => {
    const discrimPattern = /#(\d\d\d\d)$/gm;
    let discrim = discrimPattern.exec(name);
    discrim = discrim ? discrim[1] : null;
    return discrim;
};

export const getName = (userResolvable) => {
    if (userResolvable == null) return null;
    if (typeof userResolvable === 'string') return userResolvable;
    return isMember(userResolvable) ? userResolvable.user.username : userResolvable.username;
};

export const getMostName = (userResolvable) => {
    if (userResolvable == null) return null;
    if (typeof userResolvable === 'string') return userResolvable;
    const username = getName(userResolvable);
    const discrim = isMember(userResolvable) ? userResolvable.user.discriminator : userResolvable.discriminator;
    return `${username}#${discrim}`;
};

export const getFullName = (userResolvable, strict = true) => {
    if (userResolvable == null) return strict ? null : 'null';
    if (typeof userResolvable === 'string') return userResolvable;
    const mostName = getMostName(userResolvable);
    return `${mostName} (${userResolvable.id})`;
};

export const isId = (str) => {
    let id = str.match(/^\d+$/);

    if (id == null) {
        id = str.match(/^<.?(\d+)>$/);
        if (id == null) return undefined;
        id = id[1];
    } else {
        id = id[0];
    }

    if (id.length < 17 || id.length > 19) return undefined;

    return id;
};

export const getSafeId = id => (id.match(/\d+/) || [])[0];

export const getMemberById = (id, guild) => {
    if (id == null || guild == null) return null;

    if (id.substr(0, 1) === '<' && id.substr(id.length - 1, 1) === '>') id = getSafeId(id);

    if (id == null || id.length < 1) return null;

    return guild.members.get(id);
};

export const getMemberByName = (name, guild) => {
    // [v3.0] Visible name match, real name match, length match, caps match, position match
    if (guild == null) return undefined;

    const nameDiscrim = getDiscriminatorFromName(name);
    if (nameDiscrim) {
        const namePre = name.substr(0, name.length - 5);
        const member = guild.members.find(m => m.user.username === namePre && m.user.discriminator === nameDiscrim);
        if (member) return member;
    }

    let removeUnicode = true;
    const origName = name.trim();

    name = name.replace(/[^\x00-\x7F]/g, '').trim();

    if (name.length == 0) {
        name = origName;
        removeUnicode = false;
    }

    const str2Lower = name.toLowerCase();
    const { members } = guild;
    let strongest = null;

    if (str2Lower == 'vaeb') {
        const selfMember = members.get(vaebId);
        if (selfMember) return selfMember;
    }

    members.forEach((member) => {
        let realName = member.nickname != null ? member.nickname : getName(member);
        if (removeUnicode) realName = realName.replace(/[^\x00-\x7F]/g, '');
        realName = realName.trim();
        let realstr2Lower = realName.toLowerCase();
        let nameMatch = realstr2Lower.indexOf(str2Lower);

        const strength = { member };
        let layer = 0;

        if (nameMatch >= 0) {
            strength[layer++] = 2;
        } else {
            realName = getName(member);
            if (removeUnicode) realName = realName.replace(/[^\x00-\x7F]/g, '');
            realName = realName.trim();
            realstr2Lower = realName.toLowerCase();
            nameMatch = realstr2Lower.indexOf(str2Lower);
            if (nameMatch >= 0) {
                strength[layer++] = 1;
            }
        }

        if (nameMatch >= 0) {
            // Util.log("(" + i + ") " + realName + ": " + value);
            const filled = Math.min(name.length / realName.length, 0.999);
            // Util.log("filled: " + filled);
            strength[layer++] = filled;

            const maxCaps = Math.min(name.length, realName.length);
            let numCaps = 0;
            for (let j = 0; j < maxCaps; j++) {
                if (name[j] === realName[nameMatch + j]) numCaps++;
            }
            const caps = Math.min(numCaps / maxCaps, 0.999);
            // const capsExp = (filledExp * 0.5 - 1 + caps);
            // Util.log("caps: " + caps + " (" + numCaps + "/" + maxCaps + ")");
            strength[layer++] = caps;

            const totalPosition = realName.length - name.length;
            const perc = 1 - (totalPosition * nameMatch == 0 ? 0.001 : nameMatch / totalPosition);
            // const percExp = (capsExp - 2 + perc);
            // Util.log("pos: " + perc + " (" + nameMatch + "/" + totalPosition + ")");
            strength[layer++] = perc;

            if (strongest == null) {
                strongest = strength;
            } else {
                for (let i = 0; i < layer; i++) {
                    if (strength[i] > strongest[i]) {
                        strongest = strength;
                        break;
                    } else if (strength[i] < strongest[i]) {
                        break;
                    }
                }
            }
        }
    });

    return strongest != null ? strongest.member : undefined;
};

export const getMemberByMixed = (name, guild) => {
    if (guild == null) return undefined;
    let targetMember = getMemberById(name, guild);
    if (targetMember == null) targetMember = getMemberByName(name, guild);
    return targetMember;
};
