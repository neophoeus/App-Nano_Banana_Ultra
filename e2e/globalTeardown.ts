import { restorePlaywrightOutputState } from './utils/outputStateIsolation';

async function globalTeardown() {
    restorePlaywrightOutputState();
}

export default globalTeardown;
