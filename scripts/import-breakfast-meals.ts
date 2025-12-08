import XLSX from 'xlsx';
import { Pool } from 'pg';
import * as path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

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
  await pool.query('DELETE FROM meals_breakfast');
  
  console.log('Inserting meals...');
  for (const meal of meals) {
    await pool.query(
      `INSERT INTO meals_breakfast (name, description, ingredients, protein, carbs, fats, calories, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [meal.name, meal.description, meal.ingredients, meal.protein, meal.carbs, meal.fats, meal.calories, meal.category]
    );
  }
  
  console.log(`Successfully imported ${meals.length} breakfast meals!`);
  
  const result = await pool.query('SELECT category, COUNT(*) as count FROM meals_breakfast GROUP BY category');
  console.log('Category breakdown:');
  result.rows.forEach(row => {
    console.log(`  ${row.category}: ${row.count} meals`);
  });
  
  await pool.end();
}

importBreakfastMeals().catch(console.error);
