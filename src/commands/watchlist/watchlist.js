import { watchlist } from '../../db';
import { print, sendEmbed, sendEmbedError } from '../../util';
import { requiresServer } from '../../permissions';

export default {
    cmds: ['watchlist'],
    desc: 'Add a series to the scheduler for new-episode alerts',
    params: [],

    checkPermissions: requiresServer('cafedev'),

    func: async ({ channel }) => {
        if (!watchlist._ready) return sendEmbedError(channel, 'Watchlist still loading');

        return sendEmbed(channel, 'Watchlist', watchlist.join('\n'));
    },
};
