import nodeUtil from 'util';

import { requiresDev } from '../permissions';
import { sendEmbed } from '../util';
import { commands, prefix } from '../setup';

const paramTypeToStr = (paramType, asNice) => {
    if (typeof paramType === 'string') return paramType;
    if (asNice != null) return paramType.map(subType => paramTypeToStr(subType, asNice)).join(' with ');
    return `[ ${paramType.map(subType => paramTypeToStr(subType, asNice)).join(', ')} ]`;
};

export default {
    cmds: ['syntax'],
    desc: "Wow you're so meta",
    params: [
        {
            name: 'Command',
            desc: 'Bot command name',
            types: ['CommandName'],
            examples: [['mute', 'ping']],
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

    func: async ({ channel, args: [{ value: command }, { value: param }] }) => {
        let title;
        let desc;
        let fields;

        if (!param) {
            const { name, desc: commandDesc, params } = command;

            title = `${name} Command Syntax`.toTitleCase();
            desc = commandDesc;
            fields = params.map(({
                name, desc: paramDesc, optional, requires, types, examples,
            }) => ({
                name: `${name} Parameter`,
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

        console.log(title, desc, fields);

        sendEmbed(channel, { title, desc, fields });
    },
};
