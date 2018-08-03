import { watchlist } from '../../setup';
import { print, sendEmbed, sendEmbedError } from '../../util';

export default {
    cmds: ['watchlist'],
    desc: 'Add a series to the scheduler for new-episode alerts',
    params: [],

    func: async ({ channel }) => {
        if (!watchlist._ready) return sendEmbedError(channel, 'Watchlist still loading');

        return sendEmbed(channel, 'Watchlist', watchlist.join('\n'));
    },
};
