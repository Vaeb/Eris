import dateformat from 'dateformat';
import { print, sendEmbed, matchPosDecimal, getMostName } from '../util';
import { userResolvable, timeFormat } from '../paramTypes';

const parseTime = (content) => {
    const words = content.trim().split(' ');

    if (words.length === 0 || words.length > 2) return false;

    console.log('words', words);

    if (words.length === 1) {
        // Time+TimeFormat
        if (/^now$/i.test(words[0])) return [0, 0];
        if (/^tomorrow$/i.test(words[0])) return [1, timeFormat.parse({ str: 'day' })];

        const [fullStr, strTime, strTimeFormat] = words[0].match(/^(\d*[.]?\d+)([a-zA-Z]+)$/) || [];

        if (strTimeFormat) return parseTime(`${strTime} ${strTimeFormat}`);
    } else {
        // Time TimeFormat
        const time = matchPosDecimal(words[0]);
        if (time === undefined) return false;

        const format = timeFormat.parse({ str: words[1] });
        if (format === undefined) return false;

        return [time, format];
    }

    return false;
};

const runAtDate = (date, func) => {
    const now = new Date().getTime();
    const then = date.getTime();
    const diff = Math.max(then - now, 0);
    if (diff > 0x7fffffff) {
        setTimeout(() => {
            runAtDate(date, func);
        }, 0x7fffffff);
    } else setTimeout(func, diff);
};

export default {
    cmds: ['remind', 'tell'],
    desc: 'Set a reminder',
    params: [
        {
            name: 'User',
            desc: 'User to check',
            types: userResolvable.types,
            examples: userResolvable.examples,
            parse: userResolvable.parse2,
            parseFail: userResolvable.parseFail,
        },
        {
            name: 'Conjunction 1',
            desc: 'Optional word(s) to prefix reminder',
            types: ['Text'],
            examples: [['to', 'about', 'that']],
            parse: ({ str }) => (/^(?:to|about|that)$/.test(str.trim()) ? str : undefined),
            optional: true,
        },
        {
            name: 'Reminder',
            desc: 'What to remind the user',
            types: ['Text'],
            examples: [['fix the eris bug']],
            parse: ({ str }) => (/(?: in|\d*[.]?\d+(?: ?[a-zA-Z]+)?)$/.test(str.trim()) ? undefined : str.trim()),
        },
        {
            name: 'Conjunction 2',
            desc: 'Word(s) to prefix reminder length',
            types: ['Text'],
            examples: [['in']],
            parse: ({ str }) => (/^(?:in)$/.test(str.trim()) ? str : undefined),
            optional: true,
        },
        {
            name: 'Time',
            desc: 'How long until the reminder',
            types: ['Number', ['Number', 'TimeFormatSmall']],
            examples: [['5', '2', '17'], ['5d', '2h', '17m', '10s']],
            optional: true,
            overflowArgs: ({ str }) => {
                const [fullStr, strTime, strTimeFormat] = str.match(/^(\d*[.]?\d+)([a-zA-Z]+)$/) || [];
                if (strTimeFormat) return { type: 1, splitArgs: [strTime, strTimeFormat] };
                return undefined;
            },
            parse: ({ str }) => (/^(?:now|tomorrow)$/i.test(str.trim()) ? str.trim() : matchPosDecimal(str)),
            parseFail: ({ str }) => `"${str}" is not a positive number`,
            defaultResolve: () => undefined,
        },
        {
            name: 'Time Format',
            desc: 'What format the number argument for time is in',
            types: ['TimeFormat', 'TimeFormatSmall'],
            examples: [['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'], ['s', 'm', 'h', 'd', 'w', 'm', 'y']],
            requires: [4],
            optional: true,
            parse: timeFormat.parse,
            parseFail: ({ str }) => `"${str}" is not a valid time format - a correct time format would be something like "m" or "minutes"`,
            defaultResolve: 'hours',
        },
    ],

    func: async ({ msgObj, channel, speaker, args: [member, conj1, reminder, conj2, time, format] }) => {
        if (time === undefined) {
            msgObj.reply('How long until you want to be reminded?');
            try {
                const cancelRegex = /^(?:cancel|nevermind|no?)$/i;
                const filter = m => m.member.id === speaker.id && (cancelRegex.test(m.content) || parseTime(m.content));
                const collected = await channel.awaitMessages(filter, { maxMatches: 1, time: 16000, errors: ['time'] });
                const match = collected.first().content;

                if (cancelRegex.test(match)) return;

                [time, format] = parseTime(match);
            } catch (collected) {
                console.log('Request cancelled:', collected);
                msgObj.reply("Request cancelled (you didn't specify a time).");
                return;
            }
        } else if (time === 'now') {
            time = 0;
            format = 0;
        } else if (time === 'tomorrow') {
            time = 1;
            format = timeFormat.parse({ str: 'day' });
        }

        const formatStr = `${timeFormat.getFormatFromNum(format)}${time === 1 ? '' : 's'}`;
        const speakerDesc = speaker.id === member.id ? 'your' : `${getMostName(speaker)}'s`;

        const timeHours = time * format;

        const timeHoursFloor = Math.floor(timeHours);
        const extraMs = (timeHours - timeHoursFloor) * 60 * 60 * 1000;

        // const newDate = new Date(+new Date() + timeHours * 60 * 60 * 1000);

        let newDate = new Date();
        newDate.setHours(newDate.getHours() + timeHoursFloor);

        newDate = new Date(+newDate + extraMs);

        runAtDate(newDate, () => {
            print(channel, `${member} Here is ${speakerDesc} reminder${conj1 ? ` ${conj1}` : ''} "${reminder}"`);
        });

        sendEmbed(
            channel,
            'Set Reminder',
            `Okay, I will remind ${member}${conj1 ? ` ${conj1}` : ''} "${reminder}" in ${time} ${formatStr}`,
        );
    },
};
