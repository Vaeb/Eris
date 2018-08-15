import { commands, prefix, minExp, maxExp, xpCooldown, newUsers } from '../setup';
import { db, fetchProp, dataGuilds, dataMembersAll } from '../db';
import { onError, sendEmbed, sendEmbedError, getStampFormat, getRandomInt, getValuesFromObj } from '../util';
import { checkExpRole, addXp } from '../expRoles';
import parseCommandArgs from '../parseArgs';

const genCommandError = (channel, commandName) => {
    const commandErrorTitle = `Caught_Command_${commandName.toTitleCase()}`;

    return (err) => {
        onError(err, commandErrorTitle);
        sendEmbedError(
            channel,
            `Command failed due to an unknown issue\n\nDebug info: ${getStampFormat().substring(2)}${commandErrorTitle}`,
        );
    };
};

const checkCommand = async (msgObjValues) => {
    const {
        guild, channel, member, content, contentLower,
    } = msgObjValues;

    let usedCmd;

    const command = commands.find(({ cmds, noPrefix, minArgs }) => {
        const hasArgs = minArgs > 0;

        return cmds.some((cmd) => {
            const checkCmd = (noPrefix ? cmd : prefix + cmd) + (hasArgs ? ' ' : '');

            if (hasArgs ? contentLower.substr(0, checkCmd.length) === checkCmd : contentLower === checkCmd) {
                usedCmd = hasArgs ? checkCmd.slice(0, -1) : checkCmd;
                return true;
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
            speaker: member,
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

export const newMessage = async (msgObj) => {
    const msgObjValues = getValuesFromObj(
        msgObj,
        ['guild', 'channel', 'member', 'author', 'content'],
        [
            { newProp: 'contentLower', fromProps: ['content'], generate: content => content.toLowerCase() },
            { newProp: 'speaker', fromProps: ['member'], generate: member => member },
        ],
    );

    const {
        channel,
        speaker,
        author: { bot },
        content,
        contentLower,
    } = msgObjValues;

    // console.log(`New message | User: ${msgObjValues.member.user.username} | Content: ${msgObjValues.content}`);

    const wasCommand = bot ? false : await checkCommand(msgObjValues);

    if (!wasCommand && !bot) giveMessageExp(msgObjValues);

    if (/\bwelcome\b/.test(contentLower) && newUsers.some(id => content.includes(id))) {
        addXp(speaker, 100);
        sendEmbed(channel, { desc: `${speaker} +100 XP` });
    }
};

console.log('Ran messageHandler module');
