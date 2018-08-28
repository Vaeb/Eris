import { noChar, expEnabled } from '../../setup';
import { sendEmbed, sendEmbedError } from '../../util';
import { dataMembersAll } from '../../db';
import { expRoleGuilds, getRankFromXp } from '../../expRoles';
// import { requiresExpRoles } from '../../permissions';
// import { userResolvable } from '../../paramTypes';

export default {
    cmds: ['leaderboard', 'xpleaderboard', 'xpboard', 'top', 'xptop', 'scores'],
    desc: "Check the server's top XP rankings",
    params: [],

    // checkPermissions: [requiresExpRoles],

    func: ({ guild, channel, speaker }) => {
        if (!expRoleGuilds.includes(guild.id)) {
            sendEmbedError(channel, 'This guild does not have XP Roles enabled');
            return undefined;
        }

        if (!expEnabled) return sendEmbed(channel, null, 'XP is temporarily disabled for feature testing');

        const dataMembers = Object.values(dataMembersAll[guild.id])
            .sort(({ exp: exp1 }, { exp: exp2 }) => exp2 - exp1)
            .slice(0, 10);

        // console.log('dataMembers', dataMembers);

        sendEmbed(
            channel,
            `${guild.name} XP Ranks`,
            `${noChar}\n${dataMembers
                .map(({ userId, exp }, index) =>
                    `[${index + 1}] ${
                        guild.members.get(userId) ? guild.members.get(userId).user.username : `User Left (${userId})`
                    }: ${exp} XP (${getRankFromXp(exp).name})`)
                .join('\n\n')}`,
        );

        return undefined;
    },
};
