import { db, fetchProp } from '../db';
import { dataMembersAll, commands, prefix, dataGuilds } from '../setup';
import { onError, sendEmbed, sendEmbedError, getStampFormat, getRandomInt } from '../util';
import parseCommandArgs from '../parseArgs';

const getValuesFromObj = (obj, props, newProps) => {
    const newObj = {};

    props.forEach((prop) => {
        newObj[prop] = obj[prop];
    });

    newProps.forEach(({ newProp, fromProps, generate }) => {
        newObj[newProp] = generate(...fromProps.map(prop => obj[prop]));
    });

    return newObj;
};

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

            if (contentLower.substr(0, checkCmd.length) === checkCmd) {
                usedCmd = hasArgs ? checkCmd.slice(0, -1) : checkCmd;
                return true;
            }

            return false;
        });
    });

    if (!command) return false;

    if (!command.checkPermissions({ guild, channel, member })) {
        sendEmbed(channel, { title: 'Nope!', desc: 'You are not allowed to use this command.' });
        return true;
    }

    const strArgs = content.substring(usedCmd.length + 1);

    console.log('Ran command:', command.name, '| With:', strArgs);

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

let expIncrement = getRandomInt(10, 20);

setInterval(() => {
    const givenExpNow = givenExp;
    givenExp = {};

    const expInc = expIncrement;
    expIncrement = getRandomInt(10, 20);

    Object.entries(givenExpNow).forEach(([guildId, userIds]) => {
        db.members
            .update({ guildId, userId: { $in: userIds } }, { $inc: { exp: expInc } }, { upsert: false, multi: true })
            .catch(err => onError(err, 'Query_ExpUpdate'));

        // console.log(`Incremented exp values by ${expInc} for ${dataGuilds[guildId].guildName} members:`, userIds.join(', '));
    });
}, 1000 * 45);

const giveExp = async ({ guild, channel, member, content }) => {
    if (content.length === 0) return;

    if (!dataGuilds[guild.id].expEnabled) {
        // console.log(`Exp disabled for guild ${guild.name}`);
        return;
    }

    const newExpUsers = fetchProp(givenExp, guild.id, []);
    if (!newExpUsers.includes(member.id)) {
        const dataMembers = dataMembersAll[guild.id];

        newExpUsers.push(member.id);

        fetchProp(dataMembers, member.id, { exp: 0 }).exp += expIncrement;
        // console.log(member.user.username, dataMembers[member.id]);
        // console.log(`Added ${expIncrement} exp for ${member.user.username} in guild ${guild.name}: ${dataMembers[member.id].exp}`);
    }
};

export const newMessage = async (msgObj) => {
    const msgObjValues = getValuesFromObj(
        msgObj,
        ['guild', 'channel', 'member', 'author', 'content'],
        [{ newProp: 'contentLower', fromProps: ['content'], generate: content => content.toLowerCase() }],
    );

    const {
        author: { bot },
    } = msgObjValues;

    // console.log(`New message | User: ${msgObjValues.member.user.username} | Content: ${msgObjValues.content}`);

    const wasCommand = bot ? false : await checkCommand(msgObjValues);

    if (!wasCommand && !bot) giveExp(msgObjValues);
};

console.log('Ran messageHandler module');
