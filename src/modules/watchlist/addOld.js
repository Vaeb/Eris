/*
    import request from 'request-promise-native';
    import schedule from 'node-schedule';

    import { theTvDb } from '../auth';
    import { client } from '../setup';
    import { print, sendEmbed, sendEmbedError } from '../util';

    const baseChannel = client.channels.get('245323882360209408');
    const tvChannel = client.channels.get('455410709631729665');
    const { username, userkey, apikey } = theTvDb;

    let jwtToken = '123';

    const watchList = [
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
    ];

    const getToken = async () => {
        const options = {
            method: 'POST',
            uri: 'https://api.thetvdb.com/login',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: {
                apikey,
                userkey,
                username,
            },
            json: true,
        };

        const { token } = await request(options);
        console.log('Got token:', token);
        jwtToken = token;
    };

    const apiRequest = async (channel, uriData) => {
        try {
            const options = {
                method: 'GET',
                uri: `https://api.thetvdb.com${uriData}`,
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${jwtToken}`,
                },
                json: true,
            };

            const jsonData = await request(options);

            return jsonData;
        } catch (err) {
            console.log('Error:', err.error);
            console.log('Status:', err.statusCode);

            if (err.statusCode === 401) {
                try {
                    console.log('Getting new token...');
                    await getToken();
                    return apiRequest(channel, uriData);
                } catch (err2) {
                    console.log('TV API Login Error:', err2);
                    print(channel, 'TV API Login Errored');
                }
            } else {
                console.log('Got API error:', err.message);
            }

            return undefined;
        }
    };

    const getEpisodes = async (channel, series, page = 1, inner) => {
        const { links, data } = (await apiRequest(channel, `/series/${series.id}/episodes?page=${page}`)) || {};

        if (!data || !data.length) {
            sendEmbedError(channel, 'Series has no episodes');
            return undefined;
        }

        console.log(`Getting episodes (page ${page})`);

        if (page !== links.last) return getEpisodes(channel, series, Number(links.last));

        const nowStamp = +new Date();

        const allEpisodes = data.map(({
            id, airedSeason: season, airedEpisodeNumber: episode, episodeName, firstAired: date, overview,
        }) => ({
            id,
            season,
            episode,
            episodeName,
            date: new Date(date),
            overview,
        }));

        const pastEpisodes = allEpisodes.filter(({ date }) => +date < nowStamp);
        let futureEpisodes = allEpisodes.filter(({ date }) => +date > nowStamp);

        if (allEpisodes.length > 0 && pastEpisodes.length === 0 && page > 1) {
            const futureEpisodesPrev = getEpisodes(channel, series, page - 1, true);
            if (futureEpisodesPrev && futureEpisodesPrev.length > 0) {
                futureEpisodes = futureEpisodesPrev;
            }
        }

        if (!inner) {
            futureEpisodes = futureEpisodes.sort(({ date: date1 }, { date: date2 }) => +date1 - +date2);

            sendEmbed(channel, {
                title: 'Found Episodes',
                desc: `Found episodes for ${series.seriesName}`,
            });
        }

        return futureEpisodes;
    };

    const addSeries = async (channel, searchName) => {
        const { data } = (await apiRequest(channel, `/search/series?name=${searchName}`)) || {};

        if (!data || !data.length) {
            sendEmbedError(channel, 'Series not found');
            return;
        }

        console.log('Got API data:', data);

        const series = data[0];

        sendEmbed(channel, {
            title: 'Found Series',
            desc: `Added series ${series.seriesName} to watch-list`,
        });

        const episodes = await getEpisodes(channel, series);

        // episodes.push({ episode: 66, season: 12, date: new Date(+new Date() + 1000 * 10) });

        episodes.forEach(({ date, episode, season }) => {
            schedule.scheduleJob(date, () => {
                console.log('\n[ New Episode]', series.seriesName, season, episode, '\n');

                sendEmbed(tvChannel, {
                    title: 'New Episode!',
                    desc: `Episode ${episode} of ${series.seriesName} Season ${season} is now out`,
                    color: 'green',
                });
            });
        });

        console.log('Episodes:', episodes);
    };

    watchList.forEach(async (seriesName) => {
        await addSeries(baseChannel, seriesName);
    });

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
*/
