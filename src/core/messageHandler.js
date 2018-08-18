import { vaebId, commands, prefix, minExp, maxExp, xpCooldown, newUsers } from '../setup';
import { db, fetchProp, dataGuilds, dataMembersAll } from '../db';
import { onError, print, sendEmbed, sendEmbedError, getStampFormat, getRandomInt, getMsgObjValues, similarStringsStrict } from '../util';
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
    const {
        guild, channel, member, content, contentLower,
    } = msgObjValues;

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

let expIncrement = getRandomInt(minExp, maxExp);

setInterval(() => {
    const givenExpNow = Object.entries(givenExp);
    givenExp = {};

    const expInc = expIncrement;
    expIncrement = getRandomInt(minExp, maxExp);

    givenExpNow.forEach(([guildId, userIds]) => {
        db.members
            .update({ guildId, userId: { $in: userIds } }, { $inc: { exp: expInc } }, { upsert: false, multi: true })
            .catch(err => onError(err, 'Query_ExpUpdate'));

        // console.log(`Incremented xp values by ${expInc} for ${dataGuilds[guildId].guildName} members:`, userIds.join(', '));
    });
}, xpCooldown);

const giveMessageExp = async ({ guild, channel, member, content }) => {
    if (content.length === 0) return;

    if (!dataGuilds[guild.id].expEnabled) {
        // console.log(`Xp disabled for guild ${guild.name}`);
        return;
    }

    const newExpUsers = fetchProp(givenExp, guild.id, []);
    const userId = member.id;

    if (!newExpUsers.includes(userId)) {
        const memberData = dataMembersAll[guild.id][userId];

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
const recentMessages = []; // Messages sent in the last recentMs milliseconds
const numSimilarForSpam = 3;
const spamMessages = []; // Messages detected as spam in recentMessages stay here for limited period of time

const checkRaid = (guild, channel, speaker, content, contentLower) => {
    if (content.length < 5 || contentLower.substr(0, 1) === ';') return;

    const speakerId = speaker.id;

    if (userStatus[speakerId] === undefined) userStatus[speakerId] = 0; // Initialise user status

    const stamp = +new Date(); // Get current timestamp

    let numSimilar = 0;
    const prevSpam = spamMessages.find(spamMsg => similarStringsStrict(content, spamMsg.msg));

    for (let i = recentMessages.length - 1; i >= 0; i--) {
        const recentMsg = recentMessages[i];
        if (similarStringsStrict(content, recentMsg.msg)) {
            numSimilar++;
        } else if (stamp - recentMsg.stamp > recentMs) {
            recentMessages.splice(i, 1);
        }
    }

    if ((numSimilar >= numSimilarForSpam || prevSpam) && !contentLower.includes('welcome')) {
        // Is spam
        if (prevSpam) {
            // If message is similar to one previously detected as spam
            prevSpam.initWarn = false;
            prevSpam.numSince = 0;

            const alreadyIncluded = prevSpam.userIds.includes(speakerId);

            if (!alreadyIncluded || stamp - prevSpam.lastPrint > 2000) {
                if (!alreadyIncluded) prevSpam.userIds.push(speakerId);

                const oldLength = prevSpam.userIds.length;

                // Wait 3 seconds
                // If userIds.length is the same or 3 seconds have passed since the last print, then print

                setTimeout(() => {
                    const stamp2 = +new Date();
                    if (prevSpam.userIds.length === oldLength || stamp2 - prevSpam.lastPrint > 3000) {
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

    recentMessages.push({ msg: content, stamp });
};

const hasWelcomed = [];

export const newMessage = async (msgObj) => {
    const msgObjValues = getMsgObjValues(msgObj);

    const {
        guild,
        channel,
        speaker,
        author: { bot },
        content,
        contentLower,
    } = msgObjValues;

    // console.log(`New message | User: ${msgObjValues.member.user.username} | Content: ${msgObjValues.content}`);

    const wasCommand = bot ? false : await checkCommand(msgObjValues, msgObj);

    if (!wasCommand && !bot && content.length > 0 && speaker.id !== vaebId) {
        checkRaid(guild, channel, speaker, content, contentLower);

        giveMessageExp(msgObjValues);
    }

    if (/\bwelcome\b/.test(contentLower) && newUsers.some(id => content.includes(id)) && !hasWelcomed.includes(speaker.id)) {
        hasWelcomed.push(speaker.id);
        setTimeout(() => {
            hasWelcomed.splice(hasWelcomed.indexOf(speaker.id), 1);
        }, 1000 * 60 * 60);
        addXp(speaker, 50);
        sendEmbed(channel, { desc: `${speaker} +50 XP` });
    }
};

console.log('Ran messageHandler module');
