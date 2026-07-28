import { useEffect, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FeaturePage from '../../../components/ui/FeaturePage';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import StatusAlert from '../../../components/ui/StatusAlert';
import {
  fetchAutoReplySettings,
  fetchReplySuggestions,
  getCommunityErrorMessage,
  updateAutoReplySettings
} from '../services/communityApi';

const PREVIEW_MESSAGE = 'Hi! Are you free for a call later today?';

export default function AutoReplySettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState([]);

  useEffect(() => {
    fetchAutoReplySettings()
      .then(setSettings)
      .catch((err) => setError(getCommunityErrorMessage(err, 'Failed to load settings')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!settings?.smartSuggestionsEnabled) {
      setPreview([]);
      return;
    }
    fetchReplySuggestions(PREVIEW_MESSAGE).then(setPreview).catch(() => setPreview([]));
  }, [settings?.smartSuggestionsEnabled]);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await updateAutoReplySettings(settings);
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setError(getCommunityErrorMessage(err, 'Could not save settings'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <FeaturePage title="Auto-Reply Assistant" backLabel="Back to Community" onBack={() => navigate('/community')}>
        <LoadingState label="Loading settings..." />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage
      title="Auto-Reply Assistant"
      description="Get quick reply suggestions in chat, and set an away message for when you can't respond right away."
      backLabel="Back to Community"
      onBack={() => navigate('/community')}
    >
      <StatusAlert variant="error">{error}</StatusAlert>
      {saved && <StatusAlert variant="success">Settings saved.</StatusAlert>}

      <div className="space-y-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Smart Reply Suggestions</h3>
              <p className="mt-1 text-sm text-gray-600">
                Get quick, tappable reply suggestions in chat so you can respond without typing.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={!!settings.smartSuggestionsEnabled}
                onChange={(e) => handleChange('smartSuggestionsEnabled', e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-brand-primary after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>

          {settings.smartSuggestionsEnabled && preview.length > 0 && (
            <div className="mt-4 rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold text-gray-500">Preview for a message like "{PREVIEW_MESSAGE}"</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {preview.map((suggestion) => (
                  <span key={suggestion} className="rounded-full border border-brand-primary/30 bg-white px-3 py-1.5 text-sm text-brand-primary">
                    {suggestion}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Away Message</h3>
              <p className="mt-1 text-sm text-gray-600">
                Automatically send a reply when you haven't been active for a while.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={!!settings.awayReplyEnabled}
                onChange={(e) => handleChange('awayReplyEnabled', e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-brand-primary after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>

          {settings.awayReplyEnabled && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Message</label>
                <textarea
                  value={settings.awayMessage}
                  onChange={(e) => handleChange('awayMessage', e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border px-4 py-3"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Send after being offline for (minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="240"
                  value={settings.offlineDelayMinutes}
                  onChange={(e) => handleChange('offlineDelayMinutes', Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border px-4 py-3 sm:w-40"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
          <MessageSquareText size={18} className="shrink-0 text-brand-primary" />
          Suggestions are generated instantly on this device based on the message you received — no internet AI service is used.
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </FeaturePage>
  );
}
