import request from 'request-promise-native';
import schedule from 'node-schedule';

// import { theTvDb } from '../../auth';
import { client } from '../../setup';
import { db, watchlist } from '../../db';
import { print, sendEmbed, sendEmbedError, sendEmbedWarning } from '../../util';

const dumpChannel = client.channels.cache.get('245323882360209408');
const tvChannel = client.channels.cache.get('455410709631729665');

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
        // network: {
        //     country: { timezone },
        // },
        image: { medium },
        _embedded: { episodes: episodesOrig },
    } = seriesData;

    if (!init && watchlist.includes(seriesName)) {
        return sendEmbedError(channel, `Series ${seriesName} already in watchlist`);
    }

    const nowStamp = +new Date();

    const episodes = episodesOrig.filter(({ airstamp }) => +new Date(airstamp) > nowStamp);

    if (!init) {
        try {
            await db.watchlist.insert({ series_name: seriesName });
        } catch (err) {
            console.log('Database query error:', err);
            return sendEmbedError(channel, 'Watchlist database query errored');
        }
    }

    if (!init) watchlist.push(seriesName);

    // console.log('Got API data:', episodes);

    if (!init) {
        sendEmbed(channel, {
            title: 'Found Series',
            desc: `Added series ${seriesName} to watch-list`,
        });
    }

    if (episodes.length === 0) {
        if (!init) sendEmbedWarning(channel, `Series ${seriesName} has no more announced episodes`);
    } else {
        episodes.forEach(({ season, number: episode, airstamp }) => {
            const airDate = new Date(airstamp);

            schedule.scheduleJob(airDate, () => {
                if (!watchlist.includes(seriesName)) return;

                console.log('\n[ New Episode]', seriesName, season, episode, new Date(), '\n');

                sendEmbed(tvChannel, {
                    title: 'New Episode!',
                    desc: `Episode ${episode} of ${seriesName} Season ${season} is now out`,
                    color: 'blue',
                }).then(() => {
                    // print(channel, `{{${seriesName}}}`);
                });
            });
        });
    }

    if (!init) console.log('Scheduled episodes for', seriesName);

    return true;
};

const setupWatchlist = async () => {
    if (!watchlist._ready) await watchlist._readyPromise;

    const addPromises = watchlist.map(seriesName => addSeries(dumpChannel, seriesName, true));

    await Promise.all(addPromises);

    console.log('Scheduled watchlist episodes');
};

setupWatchlist();

export default {
    cmds: ['add', 'addseries', 'watch', 'monitor', 'schedule', 'addlist', 'addschedule'],
    desc: 'Add a series to the scheduler for new-episode alerts',
    params: [
        {
            name: 'Series Name',
            desc: 'Name of the series',
            types: ['SeriesName'],
            examples: [['One Piece', 'Doctor Who', 'Overlord']],
        },
    ],

    func: async ({ channel, args }) => {
        // console.log(111, watchlist);
        await addSeries(channel, args[0]);
        // console.log(222, watchlist);
    },
};
