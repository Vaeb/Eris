import { print } from '../util';

export default {
    cmds: ['mention random', 'mentionrandom', 'someone', 'random', 'mention'],
    desc: 'Mention someone :)',
    params: [],

    func: ({ guild, channel, speaker }) => {
        print(channel, guild.members.cache.random(1));

        return undefined;
    },
};
