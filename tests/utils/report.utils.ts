import allureReporter from '@wdio/allure-reporter';

/** What a step body can do to its own step while it runs. */
export interface StepContext {
    /** Renames the step, for a name that depends on what the body found (e.g. the text it read). */
    displayName: (name: string) => void | PromiseLike<void>;
}

/**
 * Runs `body` as one Allure step and returns its result.
 *
 * The step opens before the body runs and closes after it, so it carries a
 * duration, nests every step the body opens, and is marked FAILED with the
 * error when the body throws. `addStep`, which this replaced, recorded a step
 * only after the action had succeeded, so the step that broke a test never
 * appeared in the report.
 *
 * This is the only sanctioned way to add a step. Pages and flows use it to
 * group a sequence of actions under the name of what the user is doing.
 */
export async function step<T>(name: string, body: (context: StepContext) => Promise<T>): Promise<T> {
    return await allureReporter.step(name, (context) => body(context));
}
