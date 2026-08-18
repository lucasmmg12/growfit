/**
 * OpenFoodFacts Free API Service for Barcode Scanning and Food Database
 * Docs: https://openfoodfacts.github.io/api-documentation/
 */

export const getProductByBarcode = async (barcode) => {
    const cleanCode = barcode.toString().trim();
    if (!cleanCode) throw new Error("Código de barras inválido");

    const url = `https://world.openfoodfacts.org/api/v2/product/${cleanCode}.json`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error en la consulta del producto (HTTP ${response.status})`);
        }

        const data = await response.json();
        if (data.status === 0 || !data.product) {
            return null; // Product not found in database
        }

        const p = data.product;
        const nutriments = p.nutriments || {};

        // Calculate kcal per 100g
        const calories100g = Math.round(
            nutriments['energy-kcal_100g'] ?? 
            (nutriments['energy-kj_100g'] ? nutriments['energy-kj_100g'] / 4.184 : 0) ?? 
            nutriments['energy-kcal'] ?? 0
        );

        const protein100g = Number(nutriments.proteins_100g || nutriments.proteins || 0);
        const carbs100g = Number(nutriments.carbohydrates_100g || nutriments.carbohydrates || 0);
        const fat100g = Number(nutriments.fat_100g || nutriments.fat || 0);
        const fiber100g = Number(nutriments.fiber_100g || 0);
        const sodiumMg = Math.round(Number(nutriments.sodium_100g || 0) * 1000);

        return {
            barcode: cleanCode,
            name: p.product_name_es || p.product_name || p.generic_name || 'Producto ' + cleanCode,
            brand: p.brands || '',
            imageUrl: p.image_front_url || p.image_url || null,
            servingSize: p.serving_size || '100g',
            nutriscore: p.nutriscore_grade ? p.nutriscore_grade.toUpperCase() : null,
            per100g: {
                calories: calories100g,
                protein: Math.round(protein100g * 10) / 10,
                carbs: Math.round(carbs100g * 10) / 10,
                fat: Math.round(fat100g * 10) / 10,
                fiber: Math.round(fiber100g * 10) / 10,
                sodium: sodiumMg
            },
            categories: p.categories_tags || []
        };
    } catch (error) {
        console.error("OpenFoodFacts Lookup Error:", error);
        throw error;
    }
};

export const searchOpenFood = async (query) => {
    if (!query || query.trim().length < 2) return [];

    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8`;

    try {
        const response = await fetch(url);
        if (!response.ok) return [];

        const data = await response.json();
        const products = data.products || [];

        return products.map(p => {
            const nutriments = p.nutriments || {};
            const calories = Math.round(
                nutriments['energy-kcal_100g'] ?? 
                (nutriments['energy-kj_100g'] ? nutriments['energy-kj_100g'] / 4.184 : 0) ?? 0
            );

            return {
                barcode: p.code,
                name: p.product_name_es || p.product_name || 'Alimento',
                brand: p.brands || '',
                imageUrl: p.image_front_thumb_url || p.image_url || null,
                calories: calories,
                protein: Math.round(Number(nutriments.proteins_100g || 0)),
                carbs: Math.round(Number(nutriments.carbohydrates_100g || 0)),
                fat: Math.round(Number(nutriments.fat_100g || 0))
            };
        });
    } catch (e) {
        console.warn("OpenFoodFacts search error:", e);
        return [];
    }
};
