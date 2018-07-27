import { commands, prefix } from '../setup';
import { sendEmbed } from '../util';
import parseCommandArgs from '../parseArgs';

function getValuesFromObj(obj, ...props) {
    const newObj = {};
    props.forEach((prop) => {
        newObj[prop] = obj[prop];
    });
    return newObj;
}

export const newMessage = (msgObj) => {
    const msgObjValues = getValuesFromObj(msgObj, 'guild', 'channel', 'member', 'author', 'content');
    const { channel, member, content } = msgObjValues;

    const contentLower = content.toLowerCase();

    let usedCmd;

    const command = commands.find(({ cmds, noPrefix }) =>
        cmds.some((cmd) => {
            const checkCmd = noPrefix ? cmd : prefix + cmd;

            if (contentLower.substr(0, checkCmd.length) === checkCmd) {
                usedCmd = checkCmd;
                return true;
            }

            return false;
        }));

    if (!command) return;

    if (!command.checkPermissions({ member })) {
        sendEmbed(channel, { title: 'Nope!', desc: 'You are not allowed to use this command.' });
        return;
    }

    console.log('Ran command:', command.name);

    const strArgs = content.substring(usedCmd.length + 1);

    const parsedArgs = parseCommandArgs(command, strArgs, msgObj);

    if (parsedArgs === false) return;

    command.func({
        ...msgObjValues,
        command,
        args: parsedArgs,
    });
};

console.log('Ran messageHandler module');
