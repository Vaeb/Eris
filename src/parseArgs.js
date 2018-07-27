import { prefix } from './setup';
import { print, sendEmbed, cloneDeepArray } from './util';

const parseArgCombosInner = (args, numParams) => {
    if (args.length < numParams) return null;

    let nowGroups = [];

    const firstParamLastArg = args.length - numParams;
    nowGroups[0] = args.slice(0, firstParamLastArg + 1);
    for (let i = 1; i < numParams; i++) {
        nowGroups[i] = [args[firstParamLastArg + i]];
    }

    const argCombos = [nowGroups.map(arr => arr.join(' '))];

    if (args.length === numParams) return argCombos;

    let focus = 0;
    const endFocus = numParams - 1;

    const savePointsStack = [];

    console.log(nowGroups);

    while (focus !== endFocus || savePointsStack.length > 0) {
        if (focus === endFocus) {
            ({ nowGroups, focus } = savePointsStack.pop()); // Restore savepoint when hit end
        } else {
            const focusGroup = nowGroups[focus];
            nowGroups[focus + 1].unshift(focusGroup.pop()); // Move eoFocus to soFocusNext
            argCombos.push(nowGroups.map(arr => arr.join(' ')));
            // More than 1 left = Push savepoint
            if (focusGroup.length > 1) savePointsStack.push({ focus, nowGroups: cloneDeepArray(nowGroups) });
            focus++; // Next focus
        }
    }

    console.log('parseArgCombos', numParams, args, ':', argCombos);

    return argCombos;
};

const parseArgCombos = (args, paramCombos) =>
    [...new Set(paramCombos.map(paramIds => paramIds.length))].reduce((o, numParams) => {
        o[numParams] = parseArgCombosInner(args, numParams);
        return o;
    }, {});

const parseCommandArgs = (command, strArgs, { guild, channel } = {}) => {
    const usedArgs = strArgs.split(/\s/);

    const { params, paramCombos, minArgs } = command;
    const commandName = command.cmds[0];
    const commandFormat = command.noPrefix ? commandName : prefix + commandName;

    const numUsedArgs = strArgs.length === 0 ? 0 : usedArgs.length;

    let failErr;

    if (numUsedArgs > 0 && (!paramCombos || paramCombos.length === 0)) {
        // Fail: Should have no arguments
        failErr = `Command "${commandName}" should not have any arguments`;
    } else if (numUsedArgs < minArgs) {
        // Fail: Too little arguments
        failErr = `Command "${commandName}" needs more arguments`;
    }

    if (failErr) {
        sendEmbed(channel, {
            title: `${commandName} Failed`,
            desc: failErr,
            footer: `Use "${prefix}syntax ${commandName}" for more information`,
        });

        // sendEmbed(channel, {
        //     title: 'Command usage error',
        //     fields: [failErr, `Use "${prefix}syntax ${commandName}" for more information`],
        // });

        // print(channel, `**[ Command Usage Error ]** ${failErr} | Use "${prefix}syntax ${commandName}" for more information`);

        return false;
    }

    if (numUsedArgs === 0) return [];

    // Combination of arguments shifted in different positions to fit params
    const argComboVariations = parseArgCombos(usedArgs, paramCombos);

    // console.log('argComboVariations', argComboVariations);

    let builtArgs; // Found arguments that fit params

    // console.log('++', argComboVariations);

    let best = [];
    best.numPass = -1;

    const foundBuiltArgs = paramCombos.some((paramIdsOrig) => {
        // A combination of params (ids)

        // if (numUsedArgs < numParams) return false;

        let thrown = false;
        const argCombos = argComboVariations[paramIdsOrig.length]; // Combinations of arguments

        if (!argCombos) return false;

        const numArgCombos = argCombos.length;

        // Each combination of arguments
        for (let i = 0; i < numArgCombos; i++) {
            const paramIds = paramIdsOrig.slice(0);
            let numParams = paramIds.length;

            const nowArgs = argCombos[i].slice(0); // A combination of arguments
            const nowArgsParsed = [];

            let passed = true;
            let numPassNow = 0;
            let failArg;
            let failParam;

            // console.log('> Next combo of arguments...');

            // Each param/argument
            for (let j = 0; j < numParams; j++) {
                const paramId = paramIds[j];
                const paramData = params[paramId]; // A param (data)
                const { parse, overflowArgs } = paramData;

                if (j >= nowArgs.length) {
                    passed = false;
                    thrown = true;
                    break;
                }

                let argValue = nowArgs[j];

                if (overflowArgs) {
                    const splitData = overflowArgs({ str: argValue });
                    if (splitData) {
                        // console.log('---');
                        // console.log(paramIds, '|', nowArgs, '|', numParams);
                        const { splitArgs } = splitData;
                        console.log('SPLIT ARGS', argValue, '|', nowArgs, '|', splitArgs);
                        if (!splitArgs.some(str => str.trim() === '')) {
                            const numNewArgs = splitArgs.length - 1;
                            argValue = splitArgs[0];
                            nowArgs[j] = argValue;
                            numParams += numNewArgs;
                            nowArgs.splice(j + 1, 0, ...splitArgs.slice(1));
                            const newParamIds = [];
                            for (let k = j + 1; k <= j + numNewArgs; k++) {
                                if (k < paramIds.length) paramIds[k]++;
                                newParamIds.push(k);
                            }
                            paramIds.splice(j + 1, 0, ...newParamIds);
                            // console.log(paramIds, '|', nowArgs, '|', numParams);
                            /*
                                we know that if arguments are overflowing from current parameter, they **must** be for
                                the directly adjacent next parameter(s), so need to insert the missing parameter(s)
                            */
                        }
                    }
                }

                const parsedValue = parse({ str: argValue, guild, channel });

                // console.log('Parsing', argValue, 'as', paramData.name);

                if (parsedValue === undefined) {
                    passed = false;
                    if (failArg === undefined) {
                        failArg = argValue;
                        failParam = paramId;
                    }
                    // break;
                } else {
                    numPassNow++;
                    nowArgsParsed.push(parsedValue);
                }
            }

            if (passed) {
                // Found match
                // console.log('Parsed values:', nowArgsParsed);
                // builtArgs = paramIds.map((id, index) => ({ ...params[id], value: nowArgsParsed[index], original: nowArgs[index] }));
                // eslint-disable-next-line no-loop-func
                // console.log('gg', numParams, nowArgs, '|', nowArgsParsed);

                const builtArgsBasic = {
                    args: paramIds.map((id, index) => ({ value: nowArgsParsed[index], original: nowArgs[index] })),
                    guild,
                    channel,
                };

                builtArgs = params.map(({ id, defaultResolve, parse }) => {
                    const newArg = { ...params[id] };

                    const index = paramIds.indexOf(id);

                    if (index > -1) {
                        newArg.value = nowArgsParsed[index];
                        newArg.original = nowArgs[index];
                    } else if (defaultResolve) {
                        // Resolve default value
                        if (typeof defaultResolve === 'function') {
                            newArg.value = defaultResolve({ ...builtArgsBasic, parse });
                        } else {
                            newArg.value = parse({ str: defaultResolve, guild, channel });
                        }
                    }

                    return newArg;
                });
                return true;
            } else if (numPassNow > best.numPass) {
                best = [{ args: nowArgs, paramIds, failArg, failParam }];
                best.numPass = numPassNow;
            } else if (numPassNow === best.numPass && (!best.length || paramIds.length <= best[0].paramIds.length)) {
                const existingIndex = best.findIndex(({ failParam: failParamExisting }) => failParamExisting === failParam);
                if (existingIndex > -1) {
                    // const existingData = best[existingIndex];
                    // if (failArg.length < existingData.failArg.length) {
                    //     best.splice(existingIndex, 1);
                    //     best.push({ args: nowArgs, paramIds, failArg, failParam });
                    //     console.log('SWAP BEST:', 'REMOVED:', existingData, 'ADDED:', best[best.length - 1]);
                    // }
                } else {
                    best.push({ args: nowArgs, paramIds, failArg, failParam });
                }
            }

            // if (thrown) return;
        }

        return false;
    });

    // console.log('Found arguments!:', foundBuiltArgs, builtArgs);

    if (foundBuiltArgs) return builtArgs;

    console.log('GOT BEST:', best);

    const usageFelds = best.map(({ failArg, failParam }) => ({
        name: `> ${params[failParam].name}`,
        value: params[failParam].parseFail({ str: failArg, param: params[failParam] }),
        inline: false,
    }));
    // usageFelds.push({ name: `Use "${prefix}syntax ${commandName}" for more information` });

    sendEmbed(channel, {
        // title: 'Command usage error',
        title: `${commandName.toTitleCase()} Failed`,
        desc: `Your "${best[0].failArg}" argument does not match type${best.length > 1 ? 's' : ''} ${best
            .map(({ failParam }) => `**${params[failParam].name}**`)
            .join(' or ')}`,
        fields: usageFelds,
        footer: `Use "${prefix}syntax ${commandName}" for more information`,
    });

    // print(
    //     channel,
    //     `**[ Command Usage Error ]** Your arguments did not match the required parameters for ${commandName} | Use "${prefix}syntax ${commandName}" for more information`,
    // );

    // sendEmbed(channel, {
    //     title: 'Command usage error',
    //     // desc: '',
    //     fields: [
    //         `Command arguments did not match the required parameters for "${commandName}" `,
    //         `Use "${prefix}syntax ${commandName}" for more information`,
    //     ],
    // });

    return false;
};

export default parseCommandArgs;
