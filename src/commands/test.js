import { requiresDev } from '../permissions';
import { print, getMemberByMixed, isId, matchPosDecimal, getBaseMuteTime, getFullName } from '../util';
import { userResolvable, timeFormat } from '../paramTypes';

export default {
    cmds: ['mute'],
    desc: 'Mute a user to prevent them from sending messages for a period of time',
    params: [
        {
            name: 'User',
            desc: 'User to mute',
            // types: userResolvable.types,
            types: ['UserId', 'Username', 'UsernamePartial', 'Username#0000'],
            // examples: userResolvable.examples,
            examples: [
                ['107593015014486016', '469495067506376704'],
                ['Vaeb', 'Niimp Now'],
                ['Vae', 'Niim', 'Niimp N'],
                ['Vaeb#0001', 'Niimp Now#6015'],
            ],
            // parse: userResolvable.parse,
            parse: ({ str, guild }) => getFullName(getMemberByMixed(str, guild)) || isId(str) || undefined,
            parseFail: ({ str }) => `User not found from resolvable "${str}"`,
        },
        {
            name: 'Time',
            desc: 'How long the mute should last',
            types: ['Number', ['Number', 'TimeFormatSmall']],
            examples: [['5', '2', '17'], ['5d', '2h', '17m', '10s']],
            optional: true,
            overflowArgs: ({ str }) => {
                const [fullStr, strTime, strTimeFormat] = str.match(/^(\d*[.]?\d+)([a-zA-Z]+)$/) || [];
                if (strTimeFormat) return { type: 1, splitArgs: [strTime, strTimeFormat] };
                return undefined;
            },
            parse: ({ str }) => matchPosDecimal(str),
            parseFail: ({ str }) => `"${str}" is not a positive number`,
            defaultResolve: ({ args }) => getBaseMuteTime(args[0].value),
        },
        {
            name: 'Time Format',
            desc: 'What format the number argument for mute time is in',
            types: ['TimeFormat', 'TimeFormatSmall'],
            examples: [['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'], ['s', 'm', 'h', 'd', 'w', 'm', 'y']],
            requires: [1],
            optional: true,
            parse: timeFormat.parse,
            parseFail: ({ str }) => `"${str}" is not a valid time format - a correct time format would be something like "m" or "minutes"`,
            defaultResolve: 'minutes',
        },
        {
            name: 'Reason',
            desc: 'Reason for the mute',
            types: ['Text'],
            examples: [['Continuing to spam after being warned', 'Profanity towards other users after being asked to stop']],
            optional: true,
            // parse: ({ str }) => matchPosDecimal(str),
            defaultResolve: 'Reason not provided',
        },
    ],

    // checkPermissions: [requiresDev],

    func: ({ channel, args, argsData }) => {
        // prettier-ignore
        const argsInfo = argsData.map(({ name, value, original }) =>
            `Parsed \`${original || 'default'}\` as built-parameter \`${name}\` >>> \`${value}\``);

        argsInfo.push('', `Resolved arguments: ${args.map(value => `\`${value}\``).join(' ')}`);
        print(channel, argsInfo.join('\n'));
    },
};
