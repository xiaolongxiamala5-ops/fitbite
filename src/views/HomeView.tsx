import React from 'react';
import { IngredientInput } from '../components/ingredients/IngredientInput';
import { IngredientTags } from '../components/ingredients/IngredientTags';
import { PantrySelector } from '../components/ingredients/PantrySelector';
import { RecipeRecommendationList } from '../components/recipes/RecipeRecommendationList';
import { useRecipeMatcher } from '../hooks/useRecipeMatcher';

export const HomeView: React.FC = () => {
  const matchGroups = useRecipeMatcher();

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 16px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', color: '#111827' }}>FitBite 厨房助手</h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
          告诉你冰箱里有什么，告诉你现在真正能做什么。
        </p>
      </header>

      <section style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
        <IngredientInput />
        <IngredientTags />
        <PantrySelector />
      </section>

      <main>
        <RecipeRecommendationList matchGroups={matchGroups} />
      </main>
    </div>
  );
};