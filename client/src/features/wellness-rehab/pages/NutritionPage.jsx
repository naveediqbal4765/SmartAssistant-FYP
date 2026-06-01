// Module: Wellness & Rehabilitation | Phase 2 — Nutrition Tracking
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FeatureCard from '../../../components/ui/FeatureCard';
import FeaturePage from '../../../components/ui/FeaturePage';
import { useDialog } from '../../../components/ui/GlobalDialogProvider';
import LoadingState from '../../../components/ui/LoadingState';
import StatusAlert from '../../../components/ui/StatusAlert';
import MealSection from '../components/MealSection';
import NutritionSummaryCard from '../components/NutritionSummaryCard';
import { clearNutritionLogs, deleteNutritionLog, getNutritionLogs } from '../services/wellnessService';

const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

const emptyNutritionData = {
  breakfast: [],
  lunch: [],
  dinner: [],
  snack: [],
  totals: {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  }
};

const getTodayDate = () => new Date().toISOString().slice(0, 10);

export default function NutritionPage() {
  const navigate = useNavigate();
  const dialog = useDialog();
  const [nutritionData, setNutritionData] = useState(emptyNutritionData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNutrition = useCallback(async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const seniorId = user._id || user.id;
    const todayDate = getTodayDate();

    if (!seniorId) {
      setError('Unable to load nutrition data because the current user could not be found.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const logs = await getNutritionLogs(seniorId, todayDate);
      setNutritionData(logs);
    } catch (err) {
      setError(err.message || 'Failed to load nutrition data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNutrition();
  }, [loadNutrition]);

  const handleDelete = async (logId) => {
    try {
      await deleteNutritionLog(logId);
      await loadNutrition();
    } catch (err) {
      setError(err.message || 'Failed to delete food log');
    }
  };

  const handleClearAll = async (mealType) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const seniorId = user._id || user.id;
    const todayDate = getTodayDate();
    const confirmed = await dialog.showConfirm({
      title: `Clear ${mealType}?`,
      message: `This will delete all logged foods for ${mealType} today.`,
      confirmText: 'Clear All',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;
    try {
      await clearNutritionLogs(seniorId, todayDate, mealType);
      await loadNutrition();
    } catch (err) {
      setError(err.message || 'Failed to clear meal logs');
    }
  };

  return (
    <FeaturePage
      title="Nutrition Tracker"
      description="Log your meals and track your daily nutrition."
      backLabel="Back to Wellness"
      onBack={() => navigate('/wellness')}
    >
      {error && <StatusAlert variant="error">{error}</StatusAlert>}

      {loading ? (
        <LoadingState label="Loading nutrition data..." />
      ) : (
        <div className="space-y-6">
          <FeatureCard>
            <h2 className="mb-4 text-xl font-bold text-brand-primary">Today&apos;s Nutrition Summary</h2>
            <NutritionSummaryCard totals={nutritionData.totals} />
          </FeatureCard>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {mealTypes.map((mealType) => (
              <FeatureCard key={mealType}>
                <MealSection
                  mealType={mealType}
                  logs={nutritionData[mealType]}
                  onFoodLogged={loadNutrition}
                  onDelete={handleDelete}
                  onClearAll={handleClearAll}
                />
              </FeatureCard>
            ))}
          </div>
        </div>
      )}
    </FeaturePage>
  );
}
