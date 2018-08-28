import dateformat from 'dateformat';

import { activity } from '../setup';
import { fetchProp } from '../db';
import { print, sendEmbed, getMostName } from '../util';
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

        for (let i = 0; i < groups.length; i++) {
            const minuteData = groups[i];
            if (typeof minuteData === 'object') {
                groups[i] = `> ${minuteData.date} --- **${minuteData.num} message${minuteData.num === 1 ? '' : 's'}**`;
                if (i < groups.length - 1 && groups[i + 1].minute - minuteData.minute > 1) {
                    const minDif = groups[i + 1].minute - minuteData.minute;
                    let difStr = '-'.repeat(Math.min(minDif, 180));
                    if (minDif > 180) difStr = `**${difStr}**`;
                    groups.splice(i + 1, 0, `> ${difStr}`);
                }
            }
        }

        print(channel, `**${getMostName(member)} Guild Activity:**\n\n${groups.join('\n')}`);

        return undefined;
    },
};
