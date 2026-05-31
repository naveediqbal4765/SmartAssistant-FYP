// Module: Wellness & Rehabilitation | Phase 2 — Nutrition Tracking

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(1)) : 0;
};

const getNutrientValue = (nutrients = [], nutrientName, unitName) => {
  const nutrient = nutrients.find((item) => (
    item.nutrientName === nutrientName
    && (!unitName || item.unitName === unitName)
  ));

  return toNumber(nutrient?.value);
};

const searchFood = async (foodName) => {
  const normalized = String(foodName || '').trim();
  if (!normalized) return [];
  if (!process.env.USDA_API_KEY) return [];

  const searchUrl = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
  searchUrl.searchParams.set('query', normalized);
  searchUrl.searchParams.set('pageSize', '5');
  searchUrl.searchParams.set('api_key', process.env.USDA_API_KEY);

  try {
    const response = await fetch(searchUrl);
    if (!response.ok) return [];

    const data = await response.json();
    const foods = Array.isArray(data.foods) ? data.foods : [];

    return foods
      .filter((item) => item.description)
      .slice(0, 5)
      .map((item) => {
        const nutrients = item.foodNutrients || [];

        return {
          food_name: item.description,
          calories: getNutrientValue(nutrients, 'Energy', 'KCAL'),
          protein: getNutrientValue(nutrients, 'Protein'),
          carbs: getNutrientValue(nutrients, 'Carbohydrate, by difference'),
          fat: getNutrientValue(nutrients, 'Total lipid (fat)')
        };
      });
  } catch (err) {
    console.error('USDA FoodData Central search failed:', err.message);
    return [];
  }
};

module.exports = {
  searchFood
};
