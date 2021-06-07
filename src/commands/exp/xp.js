import { expEnabled, vaebId } from '../../setup';
import { sendEmbed } from '../../util';
import { dataMembersAll } from '../../db';
import { requiresExp } from '../../permissions';
import { userResolvable } from '../../paramTypes';

export default {
    cmds: ['xp', 'exp', 'myxp', 'my-exp'],
    desc: "Check a user's xp",
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

    checkPermissions: [requiresExp],

    func: ({ guild, channel, speaker, args }) => {
        if (!expEnabled && speaker.id !== vaebId) return sendEmbed(channel, null, 'XP is temporarily disabled for feature testing');

        const member = args[0] || speaker;

        const xp = dataMembersAll[guild.id][member.id].exp;

        const dataMembers = Object.values(dataMembersAll[guild.id])
            .filter(({ userId }) => guild.members.cache.get(userId) != null)
            .sort(({ exp: exp1 }, { exp: exp2 }) => exp2 - exp1);

        const rankNum = dataMembers.findIndex(({ userId }) => userId === member.id) + 1;
        const totalNum = dataMembers.length;

        sendEmbed(channel, 'User XP', `${member} has ${xp} xp | Rank #${rankNum} / ${totalNum} !`);

        return undefined;
    },
};
