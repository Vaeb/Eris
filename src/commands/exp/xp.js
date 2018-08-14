import { sendEmbed } from '../../util';
import { dataMembersAll } from '../../db';
import { requiresExp } from '../../permissions';
// import { userResolvable } from '../../paramTypes';

export default {
    cmds: ['xp', 'exp', 'myxp', 'my-exp'],
    desc: "Check a user's xp",
    params: [],
    // params: [
    //     {
    //         name: 'User',
    //         desc: 'User to check',
    //         types: userResolvable.types,
    //         examples: userResolvable.examples,
    //         parse: userResolvable.parse,
    //         parseFail: userResolvable.parseFail,
    //     },
    // ],

    checkPermissions: [requiresExp],

    func: ({ guild, channel, speaker }) => {
        const xp = dataMembersAll[guild.id][speaker.id].exp;

        const dataMembers = Object.values(dataMembersAll[guild.id]).sort(({ exp: exp1 }, { exp: exp2 }) => exp2 - exp1);

        const rankNum = dataMembers.findIndex(({ userId }) => userId === speaker.id) + 1;
        const totalNum = dataMembers.length;

        sendEmbed(channel, 'User XP', `${speaker} has ${xp} xp | Rank #${rankNum} / ${totalNum} !`);
    },
};
