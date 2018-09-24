import { print } from '../util';

export default {
    cmds: ['mention random', 'mentionrandom', 'someone', 'random', 'mention'],
    desc: "Check a user's xp",
    params: [],

    func: ({ guild, channel, speaker }) => {
        print(channel, guild.members.random(1));

        return undefined;
    },
};
