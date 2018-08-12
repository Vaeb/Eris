import { noChar } from '../../setup';
import { sendEmbed } from '../../util';
import { dataMembersAll } from '../../db';
import { getRankFromXp } from '../../expRoles';
// import { userResolvable } from '../../paramTypes';

export default {
    cmds: ['leaderboard', 'xpleaderboard', 'xpboard', 'top', 'xptop', 'scores'],
    desc: "Check a user's xp",
    params: [],

    func: ({ guild, channel, speaker }) => {
        const dataMembers = Object.values(dataMembersAll[guild.id])
            .sort(({ exp: exp1 }, { exp: exp2 }) => exp2 - exp1)
            .slice(0, 10);

        // console.log('dataMembers', dataMembers);

        sendEmbed(
            channel,
            `${guild.name} XP Ranks`,
            `${noChar}\n${dataMembers
                .map(({ userId, exp }, index) =>
                    `[${index + 1}] ${guild.members.get(userId).user.username}: ${exp} XP (${getRankFromXp(exp).name})`)
                .join('\n\n')}`,
        );
    },
};
