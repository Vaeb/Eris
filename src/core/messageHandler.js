import { commands, prefix } from '../setup';
import { sendEmbed } from '../util';
import parseCommandArgs from '../parseArgs';

export const newMessage = (msgObj) => {
    const { channel, member, content } = msgObj;

    let usedCmd;

    const command = commands.find(({ cmds, noPrefix, params }) => {
        const hasArgs = params.length > 0;

        return cmds.some((cmd) => {
            const checkCmd = (noPrefix ? cmd : prefix + cmd) + (hasArgs ? ' ' : '');

            if (content.substr(0, checkCmd.length) === checkCmd) {
                usedCmd = checkCmd;
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

    console.log('Ran command:', command.name);

    const parsedArgs = parseCommandArgs(command, content.substring(usedCmd.length), msgObj);

    if (parsedArgs === false) return;

    command.func({ ...msgObj, args: parsedArgs });
};

console.log('Ran messageHandler module');
