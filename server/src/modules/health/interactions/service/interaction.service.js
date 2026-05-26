const drugsDataset = require('../data/drugs.dataset.json');
const { findRuleForCategories } = require('../rules/interaction.rules');
const { explainInteraction } = require('../llm/llm.service');

const SEVERITY_RANK = {
  LOW: 1,
  MODERATE: 2,
  HIGH: 3
};

const normalizeDrugName = (name = '') => {
  return String(name).trim().toLowerCase().replace(/\s+/g, ' ');
};

const drugByName = drugsDataset.reduce((map, drug) => {
  map.set(normalizeDrugName(drug.name), drug);
  (drug.aliases || []).forEach((alias) => {
    map.set(normalizeDrugName(alias), drug);
  });
  return map;
}, new Map());

const normalizeMedicationInput = (medication) => {
  if (typeof medication === 'string') return medication;
  return medication?.name || medication?.drugName || medication?.title || '';
};

const mapMedicationsToDataset = (medications = []) => {
  return medications
    .map((medication) => {
      const inputName = normalizeMedicationInput(medication);
      const datasetMatch = drugByName.get(normalizeDrugName(inputName));

      return {
        inputName,
        matched: Boolean(datasetMatch),
        drug: datasetMatch || null,
        category: datasetMatch?.category || null,
        subCategory: datasetMatch?.subCategory || null,
        riskLevel: datasetMatch?.riskLevel || null
      };
    })
    .filter((item) => item.inputName);
};

const getHighestSeverity = (conflicts) => {
  if (!conflicts.length) return 'LOW';

  return conflicts.reduce((highest, conflict) => (
    SEVERITY_RANK[conflict.severity] > SEVERITY_RANK[highest] ? conflict.severity : highest
  ), 'LOW');
};

const getRuleEngineExplanation = (result) => {
  if (result?.explanation) return result.explanation;
  if (Array.isArray(result?.explanations) && result.explanations.length) {
    return result.explanations.join(' ');
  }

  return 'No category-based interactions detected for the recognized medicines.';
};

const generateInteractionResult = (medications = []) => {
  const mappedMedications = mapMedicationsToDataset(medications);
  const conflicts = [];
  const seenConflicts = new Set();

  for (let i = 0; i < mappedMedications.length; i += 1) {
    for (let j = i + 1; j < mappedMedications.length; j += 1) {
      const left = mappedMedications[i];
      const right = mappedMedications[j];
      if (!left.category || !right.category) continue;

      const rule = findRuleForCategories(left.category, right.category);
      if (!rule) continue;

      const conflictKey = [left.inputName, right.inputName, rule.categories.join('+')]
        .map((value) => String(value).toLowerCase())
        .sort()
        .join('::');

      if (seenConflicts.has(conflictKey)) continue;
      seenConflicts.add(conflictKey);

      conflicts.push({
        medications: [
          {
            name: left.inputName,
            matchedName: left.drug.name,
            category: left.category,
            subCategory: left.subCategory,
            riskLevel: left.riskLevel
          },
          {
            name: right.inputName,
            matchedName: right.drug.name,
            category: right.category,
            subCategory: right.subCategory,
            riskLevel: right.riskLevel
          }
        ],
        categories: rule.categories,
        severity: rule.severity,
        explanation: rule.explanation
      });
    }
  }

  const unknownMedications = mappedMedications
    .filter((item) => !item.matched)
    .map((item) => item.inputName);

  const explanations = conflicts.length
    ? conflicts.map((conflict) => conflict.explanation)
    : ['No category-based interactions detected for the recognized medicines.'];

  const recognizedMedications = mappedMedications
    .filter((item) => item.matched)
    .map((item) => ({
      inputName: item.inputName,
      matchedName: item.drug.name,
      category: item.category,
      subCategory: item.subCategory,
      riskLevel: item.riskLevel
    }));

  return {
    severity: getHighestSeverity(conflicts),
    conflicts,
    explanation: explanations.join(' '),
    explanations,
    recognizedMedications,
    recognizedMedicines: recognizedMedications,
    unknownMedications
  };
};

const shouldRequestLlmExplanation = (result) => {
  return Array.isArray(result?.conflicts)
    && result.conflicts.length > 0;
};

const checkInteractions = async (medications = []) => {
  const engineResult = generateInteractionResult(medications);
  const llmResult = shouldRequestLlmExplanation(engineResult)
    ? await explainInteraction(engineResult)
    : null;
  const llmExplanation = typeof llmResult === 'string' ? llmResult : llmResult?.explanation;

  return {
    ...engineResult,
    explanation: getRuleEngineExplanation(engineResult),
    llmExplanation: llmExplanation || null
  };
};

const getInteractionModuleStatus = async () => ({
  section: 'Drug Interactions',
  status: 'Dataset-based rule engine ready',
  datasetSize: drugsDataset.length
});

module.exports = {
  checkInteractions,
  getInteractionModuleStatus,
  generateInteractionResult,
  getRuleEngineExplanation,
  shouldRequestLlmExplanation,
  mapMedicationsToDataset
};
