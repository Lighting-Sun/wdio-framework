import data from '../data/placeHolderData.json' with { type: 'json' };

/**
 * Credentials, read from the environment with the committed fixtures as a
 * fallback (audit #25).
 *
 * SauceDemo's logins are public, so the JSON file is harmless here. The point
 * is the habit: when this framework is pointed at a real application, moving
 * the secrets out becomes a config change rather than a security incident,
 * because nothing in the specs reads the JSON directly any more.
 *
 * Set SAUCE_USERNAME / SAUCE_PASSWORD (or the LOCKED_OUT_ pair) to override.
 */

interface UserCredentials {
    username: string;
    password: string;
}

export const validUser: UserCredentials = {
    username: process.env.SAUCE_USERNAME ?? data.users.validUser.username,
    password: process.env.SAUCE_PASSWORD ?? data.users.validUser.password,
};

export const lockedOutUser: UserCredentials = {
    username: process.env.SAUCE_LOCKED_OUT_USERNAME ?? data.users.lockedOutUser.username,
    password: process.env.SAUCE_LOCKED_OUT_PASSWORD ?? data.users.lockedOutUser.password,
};
