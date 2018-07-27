import { commands, prefix } from '../setup';
import { sendEmbed } from '../util';
import parseCommandArgs from '../parseArgs';

export const newMessage = (msgObj) => {
    const { channel, member, content } = msgObj;

    const contentLower = content.toLowerCase();

    let usedCmd;

    const command = commands.find(({ cmds, noPrefix, params }) =>
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

    command.func({ ...msgObj, command, args: parsedArgs });
};

console.log('Ran messageHandler module');
