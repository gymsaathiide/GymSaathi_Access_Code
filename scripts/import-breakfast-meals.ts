
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface BreakfastMeal {
  name: string;
  description: string;
  ingredients: string;
  protein: number;
  carbs: number;
  fats: number;
  calories: number;
  category: 'veg' | 'eggetarian' | 'non-veg';
}

async function importBreakfastMeals() {
  const filePath = path.join(process.cwd(), 'attached_assets', '50-Healthy-Gym-Breakfast-Recipes-Indian-International-1-1_(1)_1765223149685.xlsx');
  
  console.log('Reading Excel file:', filePath);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  console.log(`Found ${data.length} meals to import`);
  
  const meals: BreakfastMeal[] = data.map((row: any) => {
    let category = row['Category']?.toLowerCase().trim();
    if (category === 'veg') category = 'veg';
    else if (category === 'eggetarian') category = 'eggetarian';
    else if (category === 'non-veg') category = 'non-veg';
    else category = 'veg';
    
    return {
      name: row['Recipe Name'] || '',
      description: row['Description'] || '',
      ingredients: row['Ingredients (per serving)'] || '',
      protein: parseFloat(row['Protein (g)']) || 0,
      carbs: parseFloat(row['Carbs (g)']) || 0,
      fats: parseFloat(row['Fats (g)']) || 0,
      calories: parseFloat(row['Calories (kcal)']) || 0,
      category: category as 'veg' | 'eggetarian' | 'non-veg',
    };
  });
  
  console.log('Clearing existing data...');
  const { error: deleteError } = await supabase
    .from('meals_breakfast')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (deleteError) {
    console.error('Error clearing existing data:', deleteError);
  }
  
  console.log('Inserting meals in batches...');
  const batchSize = 100;
  for (let i = 0; i < meals.length; i += batchSize) {
    const batch = meals.slice(i, i + batchSize);
    const { error: insertError } = await supabase
      .from('meals_breakfast')
      .insert(batch.map(meal => ({
        name: meal.name,
        description: meal.description,
        ingredients: meal.ingredients,
        protein: meal.protein,
        carbs: meal.carbs,
        fats: meal.fats,
        calories: meal.calories,
        category: meal.category
      })));
    
    if (insertError) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
    } else {
      console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} meals)`);
    }
  }
  
  console.log(`Successfully imported ${meals.length} breakfast meals!`);
  
  const { data: allMeals, error: countError } = await supabase
    .from('meals_breakfast')
    .select('category');
  
  if (countError) {
    console.error('Error counting meals:', countError);
  } else if (allMeals) {
    const counts: Record<string, number> = {};
    allMeals.forEach((row: any) => {
      counts[row.category] = (counts[row.category] || 0) + 1;
    });
    
    console.log('Category breakdown:');
    Object.entries(counts).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} meals`);
    });
  }
}

importBreakfastMeals().catch(console.error);
