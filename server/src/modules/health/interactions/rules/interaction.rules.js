const INTERACTION_RULES = [
  {
    categories: ['NSAID', 'Anticoagulant'],
    severity: 'HIGH',
    explanation: 'NSAIDs combined with anticoagulants can significantly increase bleeding risk.'
  },
  {
    categories: ['NSAID', 'Antiplatelet'],
    severity: 'HIGH',
    explanation: 'NSAIDs combined with antiplatelet medicines can increase gastrointestinal and systemic bleeding risk.'
  },
  {
    categories: ['Anticoagulant', 'Antiplatelet'],
    severity: 'HIGH',
    explanation: 'Anticoagulants combined with antiplatelet medicines can substantially increase bleeding risk.'
  },
  {
    categories: ['Antibiotic', 'Alcohol'],
    severity: 'MODERATE',
    explanation: 'Some antibiotics combined with alcohol may increase side effects and reduce treatment tolerance.'
  },
  {
    categories: ['Steroid', 'NSAID'],
    severity: 'MODERATE',
    explanation: 'Steroids combined with NSAIDs can increase stomach irritation, ulcer, and bleeding risk.'
  },
  {
    categories: ['SSRI', 'NSAID'],
    severity: 'MODERATE',
    explanation: 'SSRIs combined with NSAIDs may increase bleeding risk, especially gastrointestinal bleeding.'
  },
  {
    categories: ['SSRI', 'Anticoagulant'],
    severity: 'HIGH',
    explanation: 'SSRIs combined with anticoagulants may increase bleeding risk.'
  },
  {
    categories: ['MAOI', 'SSRI'],
    severity: 'HIGH',
    explanation: 'MAOIs combined with SSRIs can cause serious serotonin toxicity risk.'
  },
  {
    categories: ['MAOI', 'Decongestant'],
    severity: 'HIGH',
    explanation: 'MAOIs combined with decongestants can cause dangerous blood pressure elevation.'
  },
  {
    categories: ['ACE_Inhibitor', 'Diuretic'],
    severity: 'MODERATE',
    explanation: 'ACE inhibitors combined with diuretics can increase risk of low blood pressure or kidney strain.'
  },
  {
    categories: ['ARB', 'Diuretic'],
    severity: 'MODERATE',
    explanation: 'ARBs combined with diuretics can increase risk of low blood pressure or kidney strain.'
  },
  {
    categories: ['ACE_Inhibitor', 'NSAID'],
    severity: 'MODERATE',
    explanation: 'ACE inhibitors combined with NSAIDs may reduce blood pressure control and increase kidney risk.'
  },
  {
    categories: ['ARB', 'NSAID'],
    severity: 'MODERATE',
    explanation: 'ARBs combined with NSAIDs may reduce blood pressure control and increase kidney risk.'
  },
  {
    categories: ['Statin', 'Antifungal'],
    severity: 'HIGH',
    explanation: 'Some antifungals can increase statin exposure, raising muscle toxicity risk.'
  },
  {
    categories: ['Statin', 'Antibiotic'],
    severity: 'MODERATE',
    explanation: 'Some antibiotics can increase statin exposure and muscle toxicity risk.'
  },
  {
    categories: ['Opioid', 'Benzodiazepine'],
    severity: 'HIGH',
    explanation: 'Opioids combined with benzodiazepines can cause dangerous sedation and breathing suppression.'
  },
  {
    categories: ['Opioid', 'Alcohol'],
    severity: 'HIGH',
    explanation: 'Opioids combined with alcohol can cause dangerous sedation and breathing suppression.'
  },
  {
    categories: ['Benzodiazepine', 'Alcohol'],
    severity: 'HIGH',
    explanation: 'Benzodiazepines combined with alcohol can cause severe sedation, falls, and breathing problems.'
  },
  {
    categories: ['Antidiabetic', 'Alcohol'],
    severity: 'MODERATE',
    explanation: 'Alcohol can affect blood sugar control when combined with diabetes medicines.'
  },
  {
    categories: ['Antiepileptic', 'Alcohol'],
    severity: 'MODERATE',
    explanation: 'Alcohol can worsen sedation and seizure control when combined with antiepileptic medicines.'
  },
  {
    categories: ['Antiepileptic', 'Anticoagulant'],
    severity: 'HIGH',
    explanation: 'Some antiepileptics can alter anticoagulant levels and affect clotting control.'
  },
  {
    categories: ['Thyroid', 'PPI'],
    severity: 'LOW',
    explanation: 'Acid suppression may reduce thyroid medicine absorption in some patients.'
  },
  {
    categories: ['Antihistamine', 'Alcohol'],
    severity: 'MODERATE',
    explanation: 'Antihistamines combined with alcohol can increase sedation and fall risk.'
  },
  {
    categories: ['Decongestant', 'ACE_Inhibitor'],
    severity: 'MODERATE',
    explanation: 'Decongestants may raise blood pressure and reduce antihypertensive effectiveness.'
  },
  {
    categories: ['Decongestant', 'ARB'],
    severity: 'MODERATE',
    explanation: 'Decongestants may raise blood pressure and reduce antihypertensive effectiveness.'
  }
];

const normalizeRuleKey = (categories) => [...categories].sort().join('::');

const RULE_MAP = INTERACTION_RULES.reduce((map, rule) => {
  map.set(normalizeRuleKey(rule.categories), rule);
  return map;
}, new Map());

const findRuleForCategories = (leftCategory, rightCategory) => {
  return RULE_MAP.get(normalizeRuleKey([leftCategory, rightCategory])) || null;
};

module.exports = {
  INTERACTION_RULES,
  findRuleForCategories
};
