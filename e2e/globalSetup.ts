import { isolatePlaywrightOutputState } from './utils/outputStateIsolation';

async function globalSetup() {
    isolatePlaywrightOutputState();
}

export default globalSetup;
