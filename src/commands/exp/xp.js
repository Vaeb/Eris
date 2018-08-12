import { sendEmbed } from '../../util';
import { dataMembersAll } from '../../db';
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

    func: ({ guild, channel, speaker }) => {
        const xp = dataMembersAll[guild.id][speaker.id].exp;
        sendEmbed(channel, 'User XP', `${speaker} has ${xp} xp!`);
    },
};
