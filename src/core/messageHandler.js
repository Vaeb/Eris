import { client, selfId, vaebId, commands, prefix, minExp, maxExp, xpCooldown, newUsers, activity } from '../setup';
import { db, fetchProp, dataGuilds, dataMembersAll } from '../db';
import {
    onError,
    print,
    sendEmbed,
    sendEmbedError,
    getStampFormat,
    getRandomInt,
    getMsgObjValues,
    similarStringsStrict,
    formatTime,
    runAtDate,
} from '../util';
import { checkExpRole, addXp } from '../expRoles';
import parseCommandArgs from '../parseArgs';

const genCommandError = (channel, commandName) => {
    const commandErrorTitle = `Command_${commandName.toTitleCase()}`;

    return (err) => {
        onError(err, commandErrorTitle);
        sendEmbedError(
            channel,
            `Command failed due to an unknown issue\n\nDebug info: ${getStampFormat().substring(2)}${commandErrorTitle}`,
        );
    };
};

const checkCommand = async (msgObjValues, msgObj) => {
    const { guild, channel, member } = msgObjValues;

    let { content } = msgObjValues;

    content = content.replace(new RegExp(`^<@.?${selfId}> *`), prefix);
    const contentLower = content.toLowerCase();

    let usedCmd;

    const command = commands.find(({ cmds, noPrefix, minArgs, params }) => {
        const hasArgs = params.length > 0;
        const noArgs = minArgs === 0;

        return cmds.some((cmd) => {
            if (noArgs) {
                const checkCmd = noPrefix ? cmd : prefix + cmd;

                if (contentLower === checkCmd) {
                    usedCmd = checkCmd;
                    return true;
                }
            }

            if (hasArgs) {
                const checkCmd = `${noPrefix ? cmd : prefix + cmd} `;

                if (contentLower.substr(0, checkCmd.length) === checkCmd) {
                    usedCmd = checkCmd.slice(0, -1);
                    return true;
                }
            }

            return false;
        });
    });

    if (!command) return false;

    if (command.checkPermissions.some(permFunc => !permFunc({ guild, channel, member }))) {
        sendEmbed(channel, { title: 'Nope!', desc: 'You are not allowed to use this command.' });
        return true;
    }

    const strArgs = content.substring(usedCmd.length + 1);

    console.log(`> Command: ${command.name}${strArgs.length ? ` | With: ${strArgs}` : ''} | Speaker: ${member.user.username}#${
        member.user.discriminator
    }`);

    const parsedArgs = parseCommandArgs(command, strArgs, msgObjValues);

    if (parsedArgs === false) return true;

    // if (!parsedArgs.builtArgs) parsedArgs.builtArgs = [];
    // if (!parsedArgs.builtArgsData) parsedArgs.builtArgsData = [];

    const commandError = genCommandError(channel, command.name);

    try {
        await command.func({
            ...msgObjValues,
            msgObj,
            command,
            commandError,
            args: parsedArgs.builtArgs || [],
            argsData: parsedArgs.builtArgsData || [],
        });
    } catch (err) {
        commandError(err);
    }

    return true;
};

let givenExp = {};
const weeklyTimeNum = 1000 * 60 * 60 * 24 * 7;

// let expIncrement = getRandomInt(minExp, maxExp);
let expIncrement = getRandomInt(40, 50);

setInterval(() => {
    const givenExpNow = Object.entries(givenExp);
    givenExp = {};

    const expInc = expIncrement;
    // expIncrement = getRandomInt(minExp, maxExp);
    expIncrement = getRandomInt(40, 50);

    givenExpNow.forEach(([guildId, userIds]) => {
        db.members
            .update({ guildId, userId: { $in: userIds } }, { $inc: { exp: expInc } }, { upsert: false, multi: true })
            .catch(err => onError(err, 'Query_ExpUpdate'));

        // console.log(`Incremented xp values by ${expInc} for ${dataGuilds[guildId].guildName} members:`, userIds.join(', '));
    });
}, xpCooldown);

/*

    TODO

    -On start, dump XP vals into JSON file (no need to use the db due to rare once-per-week access)
    -No need for exports.oldExp
    -Read JSON dump on update
    -If user isn't in dump, treat initial XP as 0

*/

const setKingTimer = () => {
    const mondayDate = new Date(); // set to next monday
    mondayDate.setDate(mondayDate.getDate() + ((1 + 7 - mondayDate.getDay()) % 7 || 7));
    mondayDate.setHours(0, 0, 1, 0);
    console.log(mondayDate);

    const xpDump = JSON.parse(dataMembersAll);
    

    runAtDate(mondayDate, () => {
        const oldExpNow = Object.entries(exports.oldExp);
        exports.oldExp = {};

        oldExpNow.forEach(async ([guildId, memberVals]) => {
            const guild = client.guilds.get(guildId);

            console.log('Calculating XP king for', guildId);

            if (!guild) return;

            const kingRole = guild.roles.find(r => r.name.startsWith('XP King'));

            if (!kingRole) return;

            await Promise.all(kingRole.members.map(async (member) => {
                await member.removeRole(kingRole);
            }));

            // const king = Object.entries(memberVals)
            //     .map(([userId, oldXp]) => [userId, dataMembersAll[guildId][userId].exp - oldXp])
            //     .reduce((memberChange1, memberChange2) => (memberChange2[1] > memberChange1[1] ? memberChange2 : memberChange1), [
            //         null,
            //         -1,
            //     ]);

            const kings = Object.entries(memberVals)
                .map(([userId, oldXp]) => [userId, dataMembersAll[guildId][userId].exp - oldXp])
                .sort((memberChange1, memberChange2) => memberChange2[1] - memberChange1[1]);

            const king = kings[0];

            const kingMember = guild.members.get(king[0]);

            console.log(`Giving XP King to ${kingMember ? kingMember.user.username : null} in ${guild.name} (${king})`);

            if (!kingMember) return;

            kingMember.addRole(kingRole).catch(console.error);
        });

        setKingTimer();
    });
};

setKingTimer();

const giveMessageExp = async ({ guild, channel, member, content }) => {
    if (content.replace(/[^A-Za-z]/g, '').length < 4) return;

    if (!dataGuilds[guild.id].expEnabled) {
        // console.log(`Xp disabled for guild ${guild.name}`);
        return;
    }

    const newExpUsers = fetchProp(givenExp, guild.id, []);
    const userId = member.id;

    const memberData = dataMembersAll[guild.id][userId];

    const oldExpUsers = fetchProp(exports.oldExp, guild.id, {});
    fetchProp(oldExpUsers, userId, memberData.exp);

    if (!newExpUsers.includes(userId)) {
        newExpUsers.push(userId);

        const newExp = memberData.exp + expIncrement;
        memberData.exp = newExp;

        checkExpRole(channel, member, newExp);

        // console.log(member.user.username, dataMembers[member.id]);
        // console.log(`Added ${expIncrement} xp for ${member.user.username} in guild ${guild.name}: ${memberData.exp}`);
    }
};

const userStatus = {};

const recentMs = 20000; // What's the maximum elapsed time to count a message as recent?
const recentMessagesRaid = []; // Messages sent in the last recentMs milliseconds
const numSimilarForSpam = 3;
const spamMessages = []; // Messages detected as spam in recentMessagesRaid stay here for limited period of time

const checkRaid = (guild, channel, speaker, content, contentLower) => {
    if (content.length < 5 || contentLower.substr(0, 1) === ';') return;

    const speakerId = speaker.id;

    if (userStatus[speakerId] === undefined) userStatus[speakerId] = 0; // Initialise user status

    const stamp = +new Date(); // Get current timestamp

    let numSimilar = 0;
    const prevSpam = spamMessages.find(spamMsg => similarStringsStrict(content, spamMsg.msg));

    for (let i = recentMessagesRaid.length - 1; i >= 0; i--) {
        const recentMsg = recentMessagesRaid[i];
        if (similarStringsStrict(content, recentMsg.msg)) {
            numSimilar++;
        } else if (stamp - recentMsg.stamp > recentMs) {
            recentMessagesRaid.splice(i, 1);
        }
    }

    if ((numSimilar >= numSimilarForSpam || prevSpam) && !contentLower.includes('welcome')) {
        // Is spam
        if (prevSpam) {
            // If message is similar to one previously detected as spam
            prevSpam.initWarn = false;
            prevSpam.numSince = 0;

            const alreadyIncluded = prevSpam.userIds.includes(speakerId);

            if (!alreadyIncluded /* || stamp - prevSpam.lastPrint > 2000 */) {
                if (!alreadyIncluded) prevSpam.userIds.push(speakerId);

                const oldLength = prevSpam.userIds.length;

                // Wait 3 seconds
                // If userIds.length is the same or 3 seconds have passed since the last print, then print

                setTimeout(() => {
                    const stamp2 = +new Date();
                    if (prevSpam.userIds.length === oldLength || stamp2 - prevSpam.lastPrint > 2950) {
                        prevSpam.lastPrint = stamp2;
                        print(
                            channel,
                            `<@${vaebId}> Collected IDs for "${prevSpam.shortMsg}" spammers: [${prevSpam.userIds
                                .map(id => `'${id}'`)
                                .join(', ')}]`,
                        );
                    }
                }, 3000);
            }
        } else {
            // If message was detected as spam based on similar recent messages
            let shortMsg = content.replace(/(?:\r\n|\r|\n)+/g, ' ');
            if (shortMsg.length > 75) shortMsg = `${shortMsg.substr(0, 75)}...`;

            spamMessages.push({
                msg: content,
                shortMsg,
                stamp,
                lastPrint: 0,
                numSince: 0,
                initWarn: true,
                userIds: [speakerId],
            }); // At some point remove spam messages with really old stamp?
            // Maybe put all the users who've spammed the message on a warning?
        }
    } else {
        for (let i = spamMessages.length - 1; i >= 0; i--) {
            // Remove old spam message checks
            const oldSpam = spamMessages[i];
            oldSpam.numSince++;
            if (oldSpam.numSince >= 20) spamMessages.splice(i, 1); // Too old -> Remove
        }
    }

    recentMessagesRaid.push({ msg: content, stamp });
};

const recentMessagesAll = {};
const lastMessagesAll = {};

const expireRecent = 1000 * 15;

setInterval(() => {
    const nowStamp = +new Date();

    Object.values(recentMessagesAll).forEach((recentMessages) => {
        for (let i = recentMessages.length - 1; i >= 0; i--) {
            if (nowStamp - recentMessages[i].stamp > expireRecent) {
                recentMessages.splice(i, 1);
            }
        }
    });
}, 1000 * 30);

const checkChain = (msgObjValues) => {
    const {
        guild, channel, speaker, content, contentLower, nowStamp,
    } = msgObjValues;

    const recentMessages = fetchProp(recentMessagesAll, guild.id, []);
    recentMessages.push({ ...msgObjValues, stamp: nowStamp });

    const lastMessages = fetchProp(lastMessagesAll, guild.id, {});
    const userChain = fetchProp(lastMessages, speaker.id, {});

    if (userChain.num != null && similarStringsStrict(userChain.content, contentLower)) {
        userChain.num++;

        if (userChain.num > 4) {
            const monitorChannel = guild.channels.find(c => c.name.includes('xp-monitor'));

            if (monitorChannel) {
                const chainFields = [
                    { name: 'Username', value: `${speaker}` },
                    { name: 'Channel', value: `${channel}` },
                    { name: 'Content', value: content },
                    { name: 'Chain Size', value: `${userChain.num} messages` },
                    { name: 'Chain Time', value: formatTime(nowStamp - userChain.beganStamp) },
                ];

                if (userChain.num > 5) {
                    sendEmbed(monitorChannel, {
                        title: 'Message Chain Growth',
                        desc: 'A user has been sending the same message repeatedly. May be suspicious.',
                        fields: chainFields,
                        color: userChain.num > 14 ? 'red' : 'blue',
                    });
                } else {
                    sendEmbed(monitorChannel, {
                        title: 'Message Chain Detected',
                        desc: 'A user has been sending the same message repeatedly. May be suspicious.',
                        fields: chainFields,
                        color: 'green',
                    });
                }
            }
        }
    } else {
        userChain.num = 1;
        userChain.content = contentLower;
        userChain.beganStamp = nowStamp;
    }
};

const checkQuickDel = (msgObjValues) => {
    const {
        id, guild, channel, author, content, createdTimestamp, nowStamp,
    } = msgObjValues;

    const recentMessages = fetchProp(recentMessagesAll, guild.id, []);
    const recentMessage = recentMessages.find(data => data.id === id);

    const monitorChannel = guild.channels.find(c => c.name.includes('xp-monitor'));

    const timeElapsed = recentMessage ? Math.min(nowStamp - createdTimestamp, nowStamp - recentMessage.stamp) : nowStamp - createdTimestamp;
    const timeElapsedFormat = formatTime(timeElapsed);

    if (!monitorChannel || content.length <= 0 || content.startsWith(';')) return;

    const delData = [
        { name: 'Username', value: `${author}` },
        { name: 'Channel', value: `${channel}` },
        { name: 'Content', value: content },
        { name: 'Deleted After', value: timeElapsedFormat },
    ];

    // console.log(delData);

    if (recentMessage) {
        if (timeElapsed < 1400) {
            sendEmbed(monitorChannel, {
                title: 'Quick Deletion',
                desc: 'User message was quickly deleted. May be suspicious.',
                fields: delData,
                color: timeElapsed > 800 ? 'yellow' : 'red',
            });
        }
    } else if (timeElapsed < expireRecent - 1500) {
        sendEmbed(monitorChannel, {
            title: 'Immediate Deletion',
            desc: 'Deleted message was never stored in recent messages. Highly suspicious.',
            fields: delData,
            color: 'red',
        });
    }
};

export const delMessage = async (msgObj) => {
    const msgObjValues = getMsgObjValues(msgObj);

    const {
        // guild,
        // channel,
        // speaker,
        author: { bot },
        // content,
        // contentLower,
        // createdTimestamp,
        // nowStamp,
    } = msgObjValues;

    if (bot) return;

    checkQuickDel(msgObjValues);
};

const hasWelcomed = {};

export const newMessage = async (msgObj) => {
    const msgObjValues = getMsgObjValues(msgObj);

    const {
        guild,
        channel,
        speaker,
        author: { bot },
        content,
        contentLower,
        nowStamp,
    } = msgObjValues;

    // console.log(`New message | User: ${msgObjValues.member.user.username} | Content: ${msgObjValues.content}`);

    if (!bot && content.length > 0) checkChain(msgObjValues);

    const wasCommand = bot ? false : await checkCommand(msgObjValues, msgObj);

    if (!wasCommand && !bot && content.length > 0) {
        if (speaker.id !== vaebId && !contentLower.startsWith('$')) checkRaid(guild, channel, speaker, content, contentLower);

        giveMessageExp(msgObjValues);
    }

    const guildActivity = fetchProp(activity, guild.id, {});
    const memberActivity = guildActivity[speaker.id];

    if (memberActivity && memberActivity.tracking && !wasCommand) {
        memberActivity.stamps.push(nowStamp);
    }

    const hasWelcomedGuild = fetchProp(hasWelcomed, guild.id, []);

    if (/\bwelcome\b/.test(contentLower) && newUsers.some(id => content.includes(id)) && !hasWelcomedGuild.includes(speaker.id)) {
        hasWelcomedGuild.push(speaker.id);
        setTimeout(() => {
            hasWelcomedGuild.splice(hasWelcomedGuild.indexOf(speaker.id), 1);
        }, 1000 * 60 * 45);
        addXp(speaker, 50);
        sendEmbed(channel, { desc: `${speaker} +50 XP` });
    }
};

console.log('Ran messageHandler module');
