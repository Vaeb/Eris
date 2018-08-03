import request from 'request-promise-native';
// import schedule from 'node-schedule';

import db from '../../db';
import { watchlist } from '../../setup';
import { print, sendEmbed, sendEmbedError } from '../../util';

const apiRequest = async (channel, uriData) => {
    try {
        const options = {
            method: 'GET',
            uri: `http://api.tvmaze.com${uriData}`,
            json: true,
        };

        const jsonData = await request(options);

        return jsonData;
    } catch (err) {
        console.log('Error:', err.error);
        console.log('Status:', err.statusCode);

        console.log('Got API error:', err.message);

        return undefined;
    }
};

const remSeries = async (channel, searchName) => {
    const seriesData = (await apiRequest(channel, `/singlesearch/shows?q=${searchName}`)) || {};

    if (!seriesData || !seriesData.id) {
        return sendEmbedError(channel, `Series ${searchName} not found`);
    }

    // console.log(seriesData);

    const { id: seriesId, name: seriesName } = seriesData;

    const watchlistIndex = watchlist.indexOf(seriesName);

    if (watchlistIndex === -1) {
        return sendEmbedError(channel, `Series ${seriesName} is not in watchlist`);
    }

    try {
        await db.watchlist.remove({ series_name: seriesName });
    } catch (err) {
        console.log('Database query error:', err);
        return sendEmbedError(channel, 'Watchlist database query errored');
    }

    watchlist.splice(watchlistIndex, 1);

    // console.log('Got API data:', episodes);

    // episodes.forEach(({ season, number: episode, airstamp }) => {
    //     const airDate = new Date(airstamp);

    //     schedule.scheduleJob(airDate, () => {
    //         console.log('\n[ New Episode]', seriesName, season, episode, new Date(), '\n');

    //         sendEmbed(tvChannel, {
    //             title: 'New Episode!',
    //             desc: `Episode ${episode} of ${seriesName} Season ${season} is now out`,
    //             color: 'blue',
    //         });
    //     });
    // });

    // console.log('Scheduled episodes for', seriesName);

    sendEmbed(channel, {
        title: 'Removed Series',
        desc: `Removed series ${seriesName} from watch-list`,
    });

    return true;
};

export default {
    cmds: ['remove', 'rem', 'remseries', 'remlist', 'remschedule'],
    desc: 'Remove a series from the scheduler',
    params: [
        {
            name: 'Series Name',
            desc: 'Name of the series',
            types: ['SeriesName'],
            examples: [['One Piece', 'Doctor Who', 'Overlord']],
        },
    ],

    func: async ({ channel, args }) => {
        await remSeries(channel, args[0]);
    },
};
