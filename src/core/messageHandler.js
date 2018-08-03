import { commands, prefix } from '../setup';
import { onError, sendEmbed, sendEmbedError, getStampFormat } from '../util';
import parseCommandArgs from '../parseArgs';

const getValuesFromObj = (obj, ...props) => {
    const newObj = {};
    props.forEach((prop) => {
        newObj[prop] = obj[prop];
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

export const newMessage = async (msgObj) => {
    const msgObjValues = getValuesFromObj(msgObj, 'guild', 'channel', 'member', 'author', 'content');
    const { channel, member, content } = msgObjValues;

    const contentLower = content.toLowerCase();

    let usedCmd;

    const command = commands.find(({ cmds, noPrefix, params }) => {
        const hasArgs = params.length > 0;

        return cmds.some((cmd) => {
            const checkCmd = (noPrefix ? cmd : prefix + cmd) + (hasArgs ? ' ' : '');

            if (contentLower.substr(0, checkCmd.length) === checkCmd) {
                usedCmd = hasArgs ? checkCmd.slice(0, -1) : checkCmd;
                return true;
            }

            return false;
        });
    });

    if (!command) return;

    if (!command.checkPermissions({ member })) {
        sendEmbed(channel, { title: 'Nope!', desc: 'You are not allowed to use this command.' });
        return;
    }

    const strArgs = content.substring(usedCmd.length + 1);

    console.log('Ran command:', command.name, '| With:', strArgs);

    const parsedArgs = parseCommandArgs(command, strArgs, msgObj);

    if (parsedArgs === false) return;

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
};

console.log('Ran messageHandler module');
