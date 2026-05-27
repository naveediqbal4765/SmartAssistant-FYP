import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { checkInteractions, getInteractionErrorMessage } from './interactionApi';
import drugsDataset from '../../../../../server/src/modules/health/interactions/data/drugs.dataset.json';
import { overlayLayers } from '../../../components/ui/overlayLayers';

const severityStyles = {
  LOW: 'border-green-200 bg-green-50 text-green-700',
  MODERATE: 'border-amber-200 bg-amber-50 text-amber-700',
  HIGH: 'border-red-200 bg-red-50 text-red-700'
};

const useTagFilters = [
  { label: 'All', tags: [] },
  { label: 'Pain & Fever', tags: ['pain', 'fever'] },
  { label: 'Heart / Cardiovascular', tags: ['heart'] },
  { label: 'Diabetes', tags: ['diabetes'] },
  { label: 'Blood Pressure', tags: ['blood pressure'] },
  { label: 'Inflammation / NSAIDs', tags: ['inflammation'] },
  { label: 'Joints / Arthritis', tags: ['joints'] },
  { label: 'Cold & Flu', tags: ['cold', 'fever'] },
  { label: 'Cough', tags: ['cough'] },
  { label: 'Throat', tags: ['throat'] },
  { label: 'Digestion', tags: ['digestion'] },
  { label: 'Acidity / GI', tags: ['acidity', 'digestion'] },
  { label: 'Infection / Antibiotics', tags: ['infection'] },
  { label: 'Allergy / Antihistamine', tags: ['allergy'] },
  { label: 'Sleep / Neurological', tags: ['sleep'] },
  { label: 'Daily Use', tags: ['daily use'] }
];

export default function DrugInteractionChecker() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(null);
  const [isMedicineDropdownOpen, setIsMedicineDropdownOpen] = useState(false);
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const medicineDropdownRef = useRef(null);

  const medicineOptions = useMemo(() => {
    return [...drugsDataset]
      .map((drug) => ({
        name: drug.name,
        genericName: drug.genericName,
        aliases: Array.isArray(drug.aliases) ? drug.aliases : [],
        useTags: Array.isArray(drug.useTags) ? drug.useTags : []
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, []);

  const selectedSet = useMemo(() => new Set(selectedMedicines), [selectedMedicines]);
  const activeUseTags = activeFilter?.tags || [];

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return medicineOptions
      .filter((medicine) => !selectedSet.has(medicine.name))
      .filter((medicine) => (
        query || !activeUseTags.length || activeUseTags.some((tag) => medicine.useTags.includes(tag))
      ))
      .filter((medicine) => {
        if (!query) return true;

        return [
          medicine.name,
          medicine.genericName,
          ...medicine.aliases
        ].some((value) => String(value || '').toLowerCase().includes(query));
      })
      .slice(0, 12);
  }, [activeUseTags, medicineOptions, searchQuery, selectedSet]);

  const medications = selectedMedicines;
  const shouldShowMedicineDropdown = isMedicineDropdownOpen;

  useEffect(() => {
    const handleOutsideMouseDown = (event) => {
      if (
        medicineDropdownRef.current
        && !medicineDropdownRef.current.contains(event.target)
      ) {
        setIsMedicineDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideMouseDown);
    return () => document.removeEventListener('mousedown', handleOutsideMouseDown);
  }, []);

  const handleUseTagFilterClick = (filter) => {
    if (!filter.tags.length) {
      setActiveFilter(null);
      setIsMedicineDropdownOpen((current) => !current);
      return;
    }

    const isSameFilter = activeFilter?.label === filter.label;
    setActiveFilter(filter);
    setIsMedicineDropdownOpen((current) => (isSameFilter ? !current : true));
  };

  const handleSelectMedicine = (medicineName) => {
    setSelectedMedicines((current) => (
      current.includes(medicineName) ? current : [...current, medicineName].sort((left, right) => left.localeCompare(right))
    ));
    setSearchQuery('');
    setIsMedicineDropdownOpen(false);
  };

  const handleRemoveMedicine = (medicineName) => {
    setSelectedMedicines((current) => current.filter((name) => name !== medicineName));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!medications.length) {
      setError('Select at least one medicine from the database.');
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
  const detailedExplanation = result?.llmExplanation
    || result?.explanation
    || result?.explanations?.join(' ');
  const explanationTitle = result?.llmExplanation ? 'AI Explanation' : 'Explanation';

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">Check Drug Interactions</h2>
          <p className="mt-1 text-sm text-gray-500">
            Select medicines from the controlled dataset. Only listed medicines can be checked.
          </p>
        </div>

        <div ref={medicineDropdownRef} className="relative">
          <label className="mb-2 block text-sm font-semibold text-gray-700">Search medicines</label>
          <input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setIsMedicineDropdownOpen(true);
            }}
            onFocus={() => setIsMedicineDropdownOpen(true)}
            placeholder="Type to search medicines..."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-green-600 focus:outline-none"
          />
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {useTagFilters.map((filter) => {
              const isAllFilter = !filter.tags.length;
              const isActive = isAllFilter
                ? !activeFilter
                : activeFilter?.label === filter.label;

              return (
                <button
                  key={filter.label}
                  type="button"
                  onClick={() => handleUseTagFilterClick(filter)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? 'border-green-600 bg-green-600 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
          {shouldShowMedicineDropdown && (
            <div className={`absolute ${overlayLayers.dropdown} mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl`}>
              {filteredOptions.length ? (
                filteredOptions.map((medicine) => (
                  <button
                    key={medicine.name}
                    type="button"
                    onClick={() => handleSelectMedicine(medicine.name)}
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-green-50"
                  >
                    <span className="block">{medicine.name}</span>
                    {!!medicine.aliases.length && (
                      <span className="mt-1 block text-xs font-normal text-gray-500">
                        Also known as: {medicine.aliases.slice(0, 3).join(', ')}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">
                  Medicine not found in database. Please select from the available list.
                </div>
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
                      <span className="text-sm font-semibold text-gray-700">
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
              <p className="text-gray-700">No category-based conflicts detected.</p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-xl font-bold text-gray-900">{explanationTitle}</h3>
            <div className="space-y-3 text-sm leading-6 text-gray-700">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
                  li: ({ children }) => <li className="pl-1">{children}</li>
                }}
              >
                {detailedExplanation || 'No category-based interactions detected for the recognized medicines.'}
              </ReactMarkdown>
            </div>
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
                    <p className="text-gray-700">Category: {medicine.category}</p>
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
