import dateformat from 'dateformat';

import { activity } from '../setup';
import { fetchProp } from '../db';
import { print, sendEmbed } from '../util';
import { userResolvable } from '../paramTypes';
import { requiresStaff } from '../permissions';

export default {
    cmds: ['activity'],
    desc: "Check a tracked user's activity",
    params: [
        {
            name: 'User',
            desc: 'User to track',
            types: userResolvable.types,
            examples: userResolvable.examples,
            parse: userResolvable.parse,
            parseFail: userResolvable.parseFail,
        },
    ],

    checkPermissions: [requiresStaff],

    func: async ({ guild, channel, args: [member] }) => {
        const guildActivity = fetchProp(activity, guild.id, {});
        const memberActivity = fetchProp(guildActivity, member.id, { tracking: false, stamps: [] });

        if (memberActivity.stamps.length === 0) return sendEmbed(channel, null, `No activity stored for ${member}`);

        const minNum = 1000 * 60;
        const groups = [];

        memberActivity.stamps.forEach((stamp) => {
            const stampMinute = Math.floor(stamp / minNum);
            const stampStr = `${dateformat(new Date(stamp), 'dd-mm-yyyy @ h:MM TT')} GMT`;

            const lastGroup = groups[groups.length - 1];

            if (lastGroup && lastGroup.minute === stampMinute) {
                lastGroup.num++;
            } else {
                groups.push({ minute: stampMinute, date: stampStr, num: 1 });
            }
        });

        const out = groups
            .map(minuteData => `> ${minuteData.date} --- **${minuteData.num} message${minuteData.num === 1 ? '' : 's'}**`)
            .join('\n');

        print(channel, out);

        return undefined;
    },
};
