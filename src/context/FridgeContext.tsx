import React, { createContext, useContext, useState, useEffect } from 'react';
import { CanonicalIngredient } from '../core/ingredients/canonical';
import { getFavorites, toggleFavorite as toggleFavoriteRepo } from '../core/favorites/favoritesRepository';
import { getStoredPantryCatalog, getStoredPantrySelection, savePantryCatalog, savePantrySelection } from '../core/pantry/pantry';

interface FridgeContextType {
  fridgeIngredients: CanonicalIngredient[];
  addIngredient: (ingredient: CanonicalIngredient) => void;
  removeIngredient: (id: string) => void;
  clearIngredients: () => void;
  
  pantryIngredients: string[];
  togglePantry: (id: string) => void;
  setPantry: (ids: string[]) => void;
  pantryCatalogIds: string[];
  addPantryItem: (id: string) => void;
  
  favorites: string[];
  toggleFavorite: (id: string) => void;
}

const FridgeContext = createContext<FridgeContextType | undefined>(undefined);

export const FridgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fridgeIngredients, setFridgeIngredients] = useState<CanonicalIngredient[]>([]);
  const [pantryIngredients, setPantryIngredients] = useState<string[]>(getStoredPantrySelection);
  const [pantryCatalogIds, setPantryCatalogIds] = useState<string[]>(getStoredPantryCatalog);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const addIngredient = (item: CanonicalIngredient) => {
    setFridgeIngredients(prev => {
      if (prev.some(i => i.id === item.id)) return prev;
      return [...prev, item];
    });
  };

  const removeIngredient = (id: string) => {
    setFridgeIngredients(prev => prev.filter(i => i.id !== id));
  };

  const clearIngredients = () => setFridgeIngredients([]);

  const togglePantry = (id: string) => {
    setPantryIngredients(prev => {
      const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      savePantrySelection(next);
      return next;
    });
  };

  const setPantry = (ids: string[]) => {
    setPantryIngredients(ids);
    savePantrySelection(ids);
  };

  const addPantryItem = (id: string) => {
    setPantryCatalogIds(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      savePantryCatalog(next);
      return next;
    });
  };

  const toggleFavorite = (id: string) => {
    toggleFavoriteRepo(id);
    setFavorites(getFavorites());
  };

  return (
    <FridgeContext.Provider
      value={{
        fridgeIngredients,
        addIngredient,
        removeIngredient,
        clearIngredients,
        pantryIngredients,
        togglePantry,
        setPantry,
        pantryCatalogIds,
        addPantryItem,
        favorites,
        toggleFavorite
      }}
    >
      {children}
    </FridgeContext.Provider>
  );
};

export function useFridge() {
  const context = useContext(FridgeContext);
  if (!context) {
    throw new Error('useFridge 必须在 FridgeProvider 内使用');
  }
  return context;
}