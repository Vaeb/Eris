import { sendEmbed } from '../util';
import { commands, prefix } from '../setup';

const paramTypeToStr = (paramType, asNice) => {
    if (typeof paramType === 'string') return paramType;
    if (asNice != null) return paramType.map(subType => paramTypeToStr(subType, asNice)).join(' with ');
    return `[ ${paramType.map(subType => paramTypeToStr(subType, asNice)).join(', ')} ]`;
};

export default {
    cmds: ['syntax', 'help', 'info', 'commands', 'cmds', 'command', 'cmd'],
    desc: "Wow you're so meta",
    params: [
        {
            name: 'Command',
            desc: 'Bot command name',
            types: ['CommandName'],
            examples: [['mute', 'ping']],
            optional: true,
            parse: ({ str }) => {
                str = str.toLowerCase();
                if (str.substr(0, prefix.length) === prefix) str = str.substring(prefix.length);
                return commands.find(({ cmds }) => cmds.some(cmd => cmd.toLowerCase() === str)) || undefined;
            },
        },
        {
            name: 'Command Parameter',
            desc: 'Bot command parameter name',
            types: ['CommandParameterName'],
            examples: [['user', 'time', 'timeformat']],
            requires: [0],
            optional: true,
            parse: ({ str }) => {
                str = str.toLowerCase();
                let foundParam;
                commands.some(({ params }) =>
                    params.some((paramData) => {
                        if (paramData.name.toLowerCase() === str) {
                            foundParam = paramData;
                            return true;
                        }
                        return false;
                    }));
                return foundParam;
            },
        },
    ],

    func: async ({ channel, args: [command, param] }) => {
        let title;
        let desc;
        let fields;

        if (!command) {
            title = 'Commands';
            desc = 'List of bot commands';
            fields = commands.map(({ cmds, desc: commandDesc, noPrefix }) => ({
                name: `${noPrefix ? '' : prefix}${cmds[0]}`,
                value: commandDesc,
                inline: false,
            }));
        } else if (!param) {
            const { name: commandName, desc: commandDesc, params } = command;

            title = `${commandName} Command Syntax`.toTitleCase();
            desc = commandDesc;
            fields = params.map(({
                name: paramName, desc: paramDesc, optional, requires, types, examples,
            }) => ({
                name: `${paramName} Parameter`,
                value: [
                    `**Description: **${paramDesc}`,
                    `**Types: **${types.map(paramType => paramTypeToStr(paramType, true)).join(' | ')}`,
                    optional ? '**Optional: **True' : undefined,
                    requires ? `**Requires Parameter: **${requires.map(paramIndex => params[paramIndex].name).join(' and ')}` : undefined,
                    `**Examples: **\n${examples
                        .map((typeExamples, index) => `${paramTypeToStr(types[index], true)}: ${typeExamples.join(' | ')}`)
                        .join('\n')}`,
                ]
                    .filter(val => val)
                    .join('\n'),
            }));
        }

        // console.log(title, desc, fields);

        sendEmbed(channel, { title, desc, fields });
    },
};
