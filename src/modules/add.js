import request from 'request-promise-native';
import schedule from 'node-schedule';

import db from '../db';
import { theTvDb } from '../auth';
import { client, watchlist } from '../setup';
import { print, sendEmbed, sendEmbedError } from '../util';

const baseChannel = client.channels.get('245323882360209408');
const tvChannel = client.channels.get('455410709631729665');

const scheduledIds = [];

// const { username, userkey, apikey } = theTvDb;
// const jwtToken = '123';

/* const watchList = [
    'One Piece',
    'Gintama',
    'My Hero Academia',
    'Overlord',
    'Attack on Titan',
    'Black Clover',
    'Boruto: Naruto Next Generations',
    'How Not to Summon a Demon Lord',
    'Angels of Death',
    'Cells at Work',
]; */

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

const addSeries = async (channel, searchName, init) => {
    const seriesData = (await apiRequest(channel, `/singlesearch/shows?q=${searchName}&embed=episodes`)) || {};

    if (!seriesData || !seriesData.id) {
        return sendEmbedError(channel, `Series ${searchName} not found`);
    }

    // console.log(seriesData);

    const {
        id: seriesId,
        name: seriesName,
        status,
        schedule: scheduleData,
        network: {
            country: { timezone },
        },
        image: { medium },
        _embedded: { episodes: episodesOrig },
    } = seriesData;

    if (scheduledIds.includes(seriesId)) {
        return sendEmbedError(channel, `Series ${seriesName} already in watchlist`);
    }

    scheduledIds.push(seriesId);

    const nowStamp = +new Date();

    const episodes = episodesOrig.filter(({ airstamp }) => +new Date(airstamp) > nowStamp);

    if (!init) {
        try {
            await db.watchlist.insert({ series_name: seriesName });
        } catch (err) {
            console.log('Database query error:', err);
            return sendEmbedError(channel, 'Watchlist database errored');
        }
    }

    // console.log('Got API data:', episodes);

    if (!init) {
        sendEmbed(channel, {
            title: 'Found Series',
            desc: `Added series ${seriesName} to watch-list`,
        });
    }

    if (episodes.length === 0) {
        if (!init) sendEmbedError(channel, `Series ${seriesName} has no more episodes`);
        return undefined;
    }

    episodes.forEach(({ season, number: episode, airstamp }) => {
        const airDate = new Date(airstamp);

        schedule.scheduleJob(airDate, () => {
            console.log('\n[ New Episode]', seriesName, season, episode, new Date(), '\n');

            sendEmbed(tvChannel, {
                title: 'New Episode!',
                desc: `Episode ${episode} of ${seriesName} Season ${season} is now out`,
                color: 'blue',
            });
        });
    });

    console.log('Scheduled episodes for', seriesName);

    return true;
};

const setupWatchlist = async () => {
    if (!watchlist._ready) await watchlist._readyPromise;
    watchlist.forEach(async (seriesName) => {
        await addSeries(baseChannel, seriesName, true);
    });
};

setupWatchlist();

export default {
    cmds: ['add', 'addseries', 'watch', 'monitor', 'schedule'],
    desc: 'Add a series to the scheduler for new-episode alerts',
    params: [
        {
            name: 'Series Name',
            desc: 'Name of the series',
            types: ['SeriesName'],
            examples: [['One Piece', 'Doctor Who', 'Overlord']],
        },
    ],

    func: ({ channel, args }) => {
        addSeries(channel, args[0]);
    },
};
