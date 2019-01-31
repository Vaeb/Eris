import { noChar, expEnabled } from '../../setup';
import { sendEmbed, sendEmbedError, roleRank } from '../../util';
import { dataMembersAll } from '../../db';
import { expRoleGuilds, getRankFromXp } from '../../expRoles';
// import { requiresExpRoles } from '../../permissions';
import { userResolvable } from '../../paramTypes';

export default {
    cmds: ['leaderboard', 'xpleaderboard', 'xpboard', 'top', 'xptop', 'scores'],
    desc: "Check the server's top XP rankings",
    // params: [],
    params: [
        {
            name: 'User',
            desc: 'User to check',
            types: userResolvable.types,
            examples: userResolvable.examples,
            parse: userResolvable.parse,
            parseFail: userResolvable.parseFail,
            optional: true,
        },
    ],

    // checkPermissions: [requiresExpRoles],

    func: ({ guild, channel, speaker, args }) => {
        const hasRanks = expRoleGuilds.includes(guild.id);

        // if (!expRoleGuilds.includes(guild.id)) {
        //     sendEmbedError(channel, 'This guild does not have XP Roles enabled');
        //     return undefined;
        // }

        if (!expEnabled) return sendEmbed(channel, null, 'XP is temporarily disabled for feature testing');

        let dataMembers = Object.values(dataMembersAll[guild.id]).sort(({ exp: exp1 }, { exp: exp2 }) => exp2 - exp1);

        dataMembers.forEach((obj, index) => {
            obj.pos = index + 1;
        });

        if (!args[0]) {
            dataMembers = dataMembers.slice(0, 10);
        } else {
            const memberIndex = dataMembers.findIndex(({ userId }) => userId === args[0].id);

            if (memberIndex === -1) return sendEmbedError(channel, 'User not found in the database');

            let cutStart = Math.max(memberIndex - 4, 0);
            const cutEnd = Math.min(cutStart + 10, dataMembers.length);
            cutStart = Math.max(Math.min(cutStart, cutEnd - 10), 0);

            dataMembers = dataMembers.slice(cutStart, cutEnd);
        }

        // console.log('dataMembers', dataMembers);

        sendEmbed(
            channel,
            `${guild.name} XP Ranks`,
            `${noChar}\n${dataMembers
                .map(({ userId, exp, pos }) =>
                    `[${pos}] ${guild.members.get(userId) || `User Left (${userId})`}: ${exp} XP (${
                        hasRanks ? getRankFromXp(exp).name : roleRank(guild, userId)
                    })`)
                .join('\n\n')}`,
        );

        return undefined;
    },
};
