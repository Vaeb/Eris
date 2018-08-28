import { activity } from '../setup';
import { fetchProp } from '../db';
import { sendEmbed } from '../util';
import { userResolvable } from '../paramTypes';
import { requiresStaff } from '../permissions';

export default {
    cmds: ['track', 'trackactivity'],
    desc: 'Track message activity of a user',
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
        const memberActivity = fetchProp(guildActivity, member.id, { tracking: true, stamps: [] });
        if (memberActivity.tracking === false) memberActivity.stamps = [];
        memberActivity.tracking = true;
        sendEmbed(channel, null, `Activated tracking for ${member}`);
    },
};
