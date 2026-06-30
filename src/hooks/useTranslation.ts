import { useAppSettings } from '../contexts/AppSettingsContext';
import { getTranslation } from '../utils/i18n';

export function useTranslation() {
    const { settings } = useAppSettings();
    const t = (key: string) => getTranslation(settings.language, key);
    return { t, language: settings.language };
}
