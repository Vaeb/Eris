import { activity } from '../setup';
import { fetchProp } from '../db';
import { sendEmbed } from '../util';
import { userResolvable } from '../paramTypes';
import { requiresStaff } from '../permissions';

export default {
    cmds: ['untrack', 'stoptrack', 'stoptracking'],
    desc: "Stop tracking a user's message activity",
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
        memberActivity.tracking = false;
        sendEmbed(channel, null, `Disabled tracking for ${member}`);
    },
};
