import { useMemo, useState } from 'react';
import { checkInteractions, getInteractionErrorMessage } from './interactionApi';
import drugsDataset from '../../../../../server/src/modules/health/interactions/data/drugs.dataset.json';

const severityStyles = {
  LOW: 'border-green-200 bg-green-50 text-green-700',
  MODERATE: 'border-amber-200 bg-amber-50 text-amber-700',
  HIGH: 'border-red-200 bg-red-50 text-red-700'
};

const normalizeMedicationInput = (value) => {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export default function DrugInteractionChecker() {
  const [manualInput, setManualInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const medicineOptions = useMemo(() => {
    return [...drugsDataset]
      .map((drug) => drug.name)
      .sort((left, right) => left.localeCompare(right));
  }, []);

  const selectedSet = useMemo(() => new Set(selectedMedicines), [selectedMedicines]);

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return medicineOptions
      .filter((name) => !selectedSet.has(name))
      .filter((name) => !query || name.toLowerCase().includes(query))
      .slice(0, 12);
  }, [medicineOptions, searchQuery, selectedSet]);

  const manualMedications = normalizeMedicationInput(manualInput);
  const medications = [...selectedMedicines, ...manualMedications];

  const handleSelectMedicine = (medicineName) => {
    setSelectedMedicines((current) => (
      current.includes(medicineName) ? current : [...current, medicineName].sort((left, right) => left.localeCompare(right))
    ));
    setSearchQuery('');
  };

  const handleRemoveMedicine = (medicineName) => {
    setSelectedMedicines((current) => current.filter((name) => name !== medicineName));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!medications.length) {
      setError('Select or enter at least one medication.');
      return;
    }

    setChecking(true);
    setError('');
    setResult(null);

    try {
      const data = await checkInteractions(medications);
      setResult(data);
    } catch (err) {
      setError(getInteractionErrorMessage(err));
    } finally {
      setChecking(false);
    }
  };

  const severity = result?.severity || 'LOW';

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">Check Drug Interactions</h2>
          <p className="mt-1 text-sm text-gray-500">
            Select medicines from the controlled dataset. Optional manual input is available for fallback entries.
          </p>
        </div>

        <div className="relative">
          <label className="mb-2 block text-sm font-semibold text-gray-700">Search medicines</label>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Type to search medicines..."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-green-600 focus:outline-none"
          />
          {searchQuery.trim() && (
            <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
              {filteredOptions.length ? (
                filteredOptions.map((medicineName) => (
                  <button
                    key={medicineName}
                    type="button"
                    onClick={() => handleSelectMedicine(medicineName)}
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-green-50"
                  >
                    {medicineName}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">No medicines found.</div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-gray-700">Selected medicines</p>
          {selectedMedicines.length ? (
            <div className="flex flex-wrap gap-2">
              {selectedMedicines.map((medicineName) => (
                <span
                  key={medicineName}
                  className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-2 text-sm font-semibold text-green-800"
                >
                  {medicineName}
                  <button
                    type="button"
                    onClick={() => handleRemoveMedicine(medicineName)}
                    className="rounded-full px-1 text-green-900 hover:bg-green-200"
                    aria-label={`Remove ${medicineName}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
              No medicines selected yet.
            </p>
          )}
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-semibold text-gray-700">Manual fallback (optional)</label>
          <textarea
            value={manualInput}
            onChange={(event) => setManualInput(event.target.value)}
            placeholder="Optional: enter extra medicines separated by commas or new lines"
            rows={3}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-green-600 focus:outline-none"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {medications.length} medication{medications.length === 1 ? '' : 's'} ready to check
          </p>
          <button
            type="submit"
            disabled={checking || !medications.length}
            className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {checking ? 'Checking...' : 'Check Interactions'}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {result && (
        <section className="space-y-5">
          <div className={`rounded-2xl border p-5 shadow-sm ${severityStyles[severity] || severityStyles.LOW}`}>
            <p className="text-sm font-semibold uppercase tracking-wide">Overall Severity</p>
            <h3 className="mt-2 text-3xl font-black">{severity}</h3>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-xl font-bold text-gray-900">Detected Conflicts</h3>
            {result.conflicts?.length ? (
              <div className="space-y-4">
                {result.conflicts.map((conflict, index) => (
                  <div key={`${conflict.categories?.join('-')}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${severityStyles[conflict.severity] || severityStyles.LOW}`}>
                        {conflict.severity}
                      </span>
                      <span className="text-sm font-semibold text-gray-600">
                        {conflict.categories?.join(' + ')}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {conflict.medications?.map((item) => item.name).join(' + ')}
                    </p>
                    <p className="mt-2 text-sm text-gray-700">{conflict.explanation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No category-based conflicts detected.</p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-xl font-bold text-gray-900">Explanation</h3>
            <ul className="list-inside list-disc space-y-2 text-gray-700">
              {(result.explanations || []).map((explanation, index) => (
                <li key={`${explanation}-${index}`}>{explanation}</li>
              ))}
            </ul>
          </div>

          {!!result.unknownMedications?.length && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
              <h3 className="mb-2 text-xl font-bold">Unknown Medicines</h3>
              <p className="text-sm">
                These entries were not found in the current dataset: {result.unknownMedications.join(', ')}
              </p>
            </div>
          )}

          {!!result.recognizedMedications?.length && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-xl font-bold text-gray-900">Recognized Medicines</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {result.recognizedMedications.map((medicine) => (
                  <div key={`${medicine.inputName}-${medicine.category}`} className="rounded-xl bg-gray-50 p-3 text-sm">
                    <p className="font-semibold text-gray-900">{medicine.inputName}</p>
                    <p className="text-gray-600">Category: {medicine.category}</p>
                    {medicine.subCategory && <p className="text-gray-500">Subcategory: {medicine.subCategory}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
