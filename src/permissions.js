import { vaebId } from './setup';
import { isStaff } from './util';

/* const createResolver = (resolver) => {
    const baseResolver = resolver;

    baseResolver.createResolver = (childResolver) => {
        const newResolver = async (parent, args, context, info) => {
            try {
                const passed = await resolver(parent, args, context, info);
                return passed && childResolver(parent, args, context, info);
            } catch (err) {
                return false;
            }
        };

        return createResolver(newResolver, false);
    };

    return baseResolver;
}; */

const createResolver = (resolver) => {
    const baseResolver = resolver;

    baseResolver.createResolver = (childResolver) => {
        const newResolver = context => resolver(context) && childResolver(context);

        return createResolver(newResolver, false);
    };

    return baseResolver;
};

export const requiresDev = createResolver(({ member }) => member.id === vaebId);

export const requiresStaff = createResolver(({ member }) => isStaff(member));
