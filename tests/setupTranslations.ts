import { beforeAll } from 'vitest';
import { preloadAllTranslations } from '../utils/translations';

beforeAll(async () => {
    await preloadAllTranslations();
});
