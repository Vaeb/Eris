import { RichEmbed } from 'discord.js';
import dateformat from 'dateformat';
import request from 'request-promise-native';
import { pastebinData } from './auth';
import { colors, defInline, vaebId, noChar, charLimit } from './setup';

String.prototype.toTitleCase = function toTitleCaseFunc() {
    return this.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

export const getStampFormat = (date = new Date()) => dateformat(date, '| dd/mm/yyyy | HH:MM | ');
export const getDateString = (date = new Date()) => `${dateformat(date, 'ddd, mmm dS yyyy @ h:MM TT')}`;

export const onError = (err, context = 'Unspecified', noLog) => {
    const errContext = `[ Caught_${context} ]`;

    if (!noLog) return console.log(`[ Caught_${context} ]`, err);

    return errContext;
};

export const escapeRegExp = str => str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

const getMatchesWithBlock = (str, matchChars, blockChars, useInside) => {
    // Gets all matches of a substring that are in/out of a code block
    const pattern = new RegExp(escapeRegExp(blockChars), 'g');
    let result;

    let numMatches = 0;
    let strPointer = 0;
    let newStr = '';

    while ((result = pattern.exec(str))) {
        numMatches++;
        if (useInside) {
            if (numMatches % 2 == 1) {
                // Open block
                newStr += '.'.repeat(result.index - strPointer);
                strPointer = result.index;
            } else {
                // Close block (Store data)
                newStr += '.'.repeat(blockChars.length) + str.substring(strPointer + blockChars.length, result.index);
                strPointer = result.index;
            }
        } else if (numMatches % 2 == 1) {
            // Open block (Store data)
            newStr += str.substring(strPointer, result.index);
            strPointer = result.index;
        } else {
            // Close block
            newStr += '.'.repeat(result.index - strPointer + blockChars.length);
            strPointer = result.index + blockChars.length;
        }
    }

    if (useInside) {
        newStr += '.'.repeat(str.length - strPointer);
    } else {
        newStr += str.substring(strPointer);
    }

    if (newStr.length != str.length) {
        throw new Error("[E_GetMatchesWithBlock] Failed because the output string didn't match input string length");
    }

    return newStr.match(new RegExp(escapeRegExp(matchChars), 'g')) || [];
};

const formatSets = [['___', '__'], ['***', '**', '*'], ['```', '``', '`']];

const splitSets = [
    // pivot: -1 = Split Start, 0 = Remove, 1 = Split End
    { chars: '```', pivot: 1 }, // Only applies to end ```
    { chars: '\n\n', pivot: 0 },
    { chars: '\n', pivot: 0 },
    { chars: ' ', pivot: 0 },
];

const leaveExtra = formatSets.reduce((a, b) => a.concat(b)).length * 2;

export const chunkMessage = (msg) => {
    if (msg.length <= charLimit) return [msg];

    const origChunks = [msg];
    let content = msg;
    let appendBeginning = [];

    const baseChunkSize = charLimit - leaveExtra;

    for (let i = 0; content; ++i, content = origChunks[i]) {
        for (let j = 0; j < appendBeginning.length; j++) {
            content = appendBeginning[j] + content;
        }

        if (content.length < charLimit) {
            origChunks[i] = content;
            break;
        }

        let chunk = content.substr(0, baseChunkSize);
        let leftOver;

        appendBeginning = [];

        for (let j = 0; j < splitSets.length; j++) {
            const splitSet = splitSets[j];
            const splitChars = splitSet.chars;
            const splitType = splitSet.pivot;

            let pivotStart = chunk.lastIndexOf(splitChars); // exclusive
            let pivotEnd = pivotStart; // inclusive

            if (pivotStart == -1) continue;

            if (splitType == 1) {
                // Split End
                pivotStart += splitChars.length;
                pivotEnd = pivotStart;
            } else if (splitType == 0) {
                // Remove
                pivotEnd += splitChars.length;
            }

            let chunkTemp = chunk.substring(0, pivotStart);

            if (splitChars == '```') {
                // Has to be closing a block
                const numSets = (chunkTemp.match(new RegExp(escapeRegExp(splitChars), 'g')) || []).length;
                if (numSets % 2 == 1) {
                    if (numSets == 1) continue;
                    pivotStart = chunk.substring(0, pivotStart - splitChars.length).lastIndexOf(splitChars);
                    if (pivotStart == -1) continue;
                    pivotStart += splitChars.length;
                    pivotEnd = pivotStart;
                    chunkTemp = chunk.substring(0, pivotStart);
                }
            }

            if (chunkTemp.length <= leaveExtra) continue;

            chunk = chunkTemp;
            leftOver = content.substr(pivotEnd);

            break;
        }

        if (leftOver == null) {
            leftOver = content.substr(baseChunkSize);
        }

        for (let j = 0; j < formatSets.length; j++) {
            const formatSet = formatSets[j];

            for (let k = 0; k < formatSet.length; k++) {
                const formatChars = formatSet[k];
                const numSets = getMatchesWithBlock(chunk, formatChars, '```', false).length; // Should really only be counting matches not inside code blocks

                if (numSets % 2 == 1) {
                    chunk += formatChars;
                    appendBeginning.push(formatChars);
                    break;
                }
            }
        }

        if (chunk.substr(chunk.length - 3, 3) == '```') appendBeginning.push('​\n');

        origChunks[i] = chunk;

        if (leftOver && leftOver.length > 0) origChunks.push(leftOver);
    }

    return origChunks;
};

export const print = async (channel, ...args) =>
    Promise.all(chunkMessage(args.join(' ')).map(async (msg, index) => {
        try {
            await channel.send(msg);
        } catch (err) {
            onError(err, `PRINT_C${index}: ${msg}`);
        }
    }));

export const printLog = (channel, ...args) => {
    console.log(...args);
    if (channel) return print(channel, ...args);
    return null;
};

export const sendEmbed = (channel, embedData = {}, embedDesc) => {
    if (embedData === null) embedData = '';
    if (typeof embedData !== 'object') embedData = { title: embedData };

    if (embedDesc !== undefined) embedData.desc = embedDesc;

    const {
        title = '', desc = '', footer = '', color: colorOrig = colors.pink, fields = [], image,
    } = embedData;

    let color = colorOrig;

    if (typeof color === 'string') ({ [color]: color } = colors);

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

    return channel.send(embed);
};

export const sendEmbedError = (channel, desc) =>
    sendEmbed(channel, {
        title: 'Command Error',
        desc,
        color: colors.red,
    });

export const sendEmbedWarning = (channel, desc) =>
    sendEmbed(channel, {
        title: 'Command Warning',
        desc,
        color: colors.yellow,
    });

export const getValuesFromObj = (obj, props = [], newProps = []) => {
    const newObj = {};

    props.forEach((prop) => {
        newObj[prop] = obj[prop];
    });

    newProps.forEach(({ newProp, fromProps, generate }) => {
        newObj[newProp] = generate(...fromProps.map(prop => obj[prop]));
    });

    return newObj;
};

export const round = (num, inc) => (inc == 0 ? num : Math.floor((num / inc) + 0.5) * inc);

export const toFixedCut = (num, decimals) => Number(num.toFixed(decimals)).toString();

export const formatTime = (time) => {
    let timeStr;
    let formatStr;

    const numSeconds = round(time / 1000, 0.1);
    const numMinutes = round(time / (1000 * 60), 0.1);
    const numHours = round(time / (1000 * 60 * 60), 0.1);
    const numDays = round(time / (1000 * 60 * 60 * 24), 0.1);
    const numWeeks = round(time / (1000 * 60 * 60 * 24 * 7), 0.1);
    const numMonths = round(time / (1000 * 60 * 60 * 24 * 30.42), 0.1);
    const numYears = round(time / (1000 * 60 * 60 * 24 * 365.2422), 0.1);

    if (numSeconds < 1) {
        timeStr = toFixedCut(time, 0);
        formatStr = `${timeStr} millisecond`;
    } else if (numMinutes < 1) {
        timeStr = toFixedCut(numSeconds, 1);
        formatStr = `${timeStr} second`;
    } else if (numHours < 1) {
        timeStr = toFixedCut(numMinutes, 1);
        formatStr = `${timeStr} minute`;
    } else if (numDays < 1) {
        timeStr = toFixedCut(numHours, 1);
        formatStr = `${timeStr} hour`;
    } else if (numWeeks < 1) {
        timeStr = toFixedCut(numDays, 1);
        formatStr = `${timeStr} day`;
    } else if (numMonths < 1) {
        timeStr = toFixedCut(numWeeks, 1);
        formatStr = `${timeStr} week`;
    } else if (numYears < 1) {
        timeStr = toFixedCut(numMonths, 1);
        formatStr = `${timeStr} month`;
    } else {
        timeStr = toFixedCut(numYears, 1);
        formatStr = `${timeStr} year`;
    }

    if (timeStr !== '1') formatStr += 's';

    return formatStr;
};

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

export const numberIf = str => (str == null ? str : Number(str));

export const matchPosDecimalRegex = /^\d*[.]?\d+$/;
export const matchPosIntegerRegex = /^\d+$/;

export const matchPosDecimal = str => numberIf((str.match(matchPosDecimalRegex) || [])[0]);
export const matchPosInteger = str => numberIf((str.match(matchPosIntegerRegex) || [])[0]);

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

export const staffPerms = ['ADMINISTRATOR', 'KICK_MEMBERS', 'BAN_MEMBERS', 'MANAGE_CHANNELS', 'MANAGE_GUILD', 'MANAGE_MESSAGES'];

export const isStaff = member =>
    member.hasPermission(staffPerms, false, true, true) || member.roles.some(({ name }) => /^(?:staff|admin|(?:head\s+?)?mod)/i.test(name));

export const isAdmin = member => member.hasPermission('ADMINISTRATOR');

export const getRandomInt = (minParam, maxParam) => {
    maxParam++; // inclusive, inclusive
    const min = Math.ceil(minParam);
    const max = Math.floor(maxParam);
    return Math.floor(Math.random() * (max - min)) + min;
};

export const strToBoolean = (str) => {
    if (str === 'true' || str === '1' || str === 'on') return true;
    if (str === 'false' || str === '0' || str === 'off') return false;
    return undefined;
};

export const getMsgObjValues = msgObj =>
    getValuesFromObj(
        msgObj,
        ['id', 'guild', 'channel', 'member', 'author', 'content', 'createdTimestamp'],
        [
            { newProp: 'contentLower', fromProps: ['content'], generate: content => content.toLowerCase() },
            { newProp: 'speaker', fromProps: ['member'], generate: member => member },
        ],
    );

const pastebinListings = {
    public: '0',
    unlisted: '1',
    private: '2',
};

export const pastebinPost = async (name, content, { format = 'text', listing = 'unlisted', expires = 'N' } = {}) => {
    const userKey = await request({
        method: 'POST',
        uri: 'https://pastebin.com/api/api_login.php',
        formData: {
            api_dev_key: pastebinData.devKey,
            api_user_name: pastebinData.username,
            api_user_password: pastebinData.password,
        },
        // json: true,
    });

    const options = {
        method: 'POST',
        uri: 'https://pastebin.com/api/api_post.php',
        formData: {
            api_dev_key: pastebinData.devKey,
            api_option: 'paste',
            api_paste_code: content,
            api_user_key: userKey,
            api_paste_name: name,
            api_paste_format: format,
            api_paste_private: pastebinListings[listing],
            api_paste_expire_date: expires,
        },
        // json: true,
    };

    // console.log('Sending:', options);

    return request(options);
};

export const getChanges = (str1, str2) => {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = []; // len1+1, len2+1

    if (len1 == 0) {
        return len2;
    } else if (len2 == 0) {
        return len1;
    } else if (str1 == str2) {
        return 0;
    }

    for (let i = 0; i <= len1; i++) {
        matrix[i] = {};
        matrix[i][0] = i;
    }

    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            let cost = 1;

            if (str1[i - 1] == str2[j - 1]) {
                cost = 0;
            }

            matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
        }
    }

    return matrix[len1][len2];
};

export const simplifyStr = (str) => {
    str = str.toLowerCase();
    const strLength = str.length;
    const midPoint = str.length / 2 + 1;
    for (let i = 1; i < midPoint; i++) {
        // Increment for number of characters in the string stopping before the last (no need to check if whole string is a repetition of itself)
        const sub = str.substr(0, i); // Get the substring from start of length i
        const num = Math.floor(strLength / i); // Get the number of times i goes into the length of the substring (number of times to repeat sub to make it fit)
        const repeatedSub = sub.repeat(num); // Repeat the substring floor(num) times
        if (repeatedSub == str) return [sub, num]; // If repeatedSub is equal to original string, return substring and repetition count
    }
    return [str, 1]; // Return substring and repetition count
};

export const simplifyStrHeavy = (str) => {
    // Assume str is already lowercase
    str = str.replace(/\s/g, '');
    const strLength = str.length;
    const midPoint = str.length / 2 + 1; // The first int x for which floor(strLength / x) is 1, a.k.a the length when a substring is too large to repeat and fit into str
    let numCanChange = 0;
    let nextInc = 2;
    for (let i = 1; i < midPoint; i++) {
        // Increments for number of characters in the string stopping before the midpoint
        const sub = str.substr(0, i); // Get the str substring of length i
        const num = Math.floor(strLength / i); // Get the number of times i goes into the length of the substring (number of times to repeat sub to make it fit)
        const repeatedSub = sub.repeat(num); // Repeat the substring num times
        const nowMaxChanges = Math.min(numCanChange * num, strLength / 2); // Get number of allowed alterations between strings to be classed as similar
        if (getChanges(repeatedSub, str) <= nowMaxChanges) return [sub, num]; // If repeatedSub is similar to original string, return substring and repetition count
        if (i >= nextInc) {
            // Update multiplier for nowMaxChanges when length is large enough
            numCanChange++;
            nextInc *= 2;
        }
    }
    return [str, 1]; // Return substring and repetition count
};

export const similarStrings = (str1, str2) => {
    str1 = str1.toLowerCase().trim();
    str2 = str2.toLowerCase().trim();

    // Get number of allowed alterations between strings to be classed as similar
    let maxChanges = Math.floor(Math.min(Math.max(Math.max(str1.length, str2.length) / 3, Math.abs(str2.length - str1.length)), 6));

    // Check if the original strings are similar (have a number of alterations between them [levenshtein distance] less/equal to maxChanges)
    if (getChanges(str1, str2) <= maxChanges) return true;

    // Simplify both strings removing repeated similar data
    [str1] = simplifyStrHeavy(str1); // Reduce similar repeated strings (e.g. dog1dog2dog3 becomes dog1)
    [str2] = simplifyStrHeavy(str2);

    // Update maxChanges for new string lengths
    maxChanges = Math.floor(Math.min(Math.max(Math.max(str1.length, str2.length) / 3, Math.abs(str2.length - str1.length)), 6));

    // Check if simplified strings are similar
    return getChanges(str1, str2) <= maxChanges;
};

export const similarStringsStrict = (str1, str2) => {
    str1 = str1.toLowerCase().trim();
    str2 = str2.toLowerCase().trim();

    if ((str1.length < 4 || str2.length < 4) && (!(str1.length == 3 || str2.length == 3) || (str1.length <= 3 && str2.length <= 3))) {
        return str1 == str2;
    }

    // Get number of allowed alterations between strings to be classed as similar
    const maxChanges = Math.floor(Math.min(Math.max(Math.max(str1.length, str2.length) / 3, Math.abs(str2.length - str1.length)), 6));

    // Check if the original strings are similar (have a number of alterations between them [levenshtein distance] less/equal to maxChanges)
    if (getChanges(str1, str2) <= maxChanges) return true;

    return false;
};
