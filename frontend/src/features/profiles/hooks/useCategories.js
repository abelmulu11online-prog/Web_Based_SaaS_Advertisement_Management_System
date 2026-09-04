/**
 * useCategories.js — React Query hook for fetching the category tree.
 * Moved here from the advertisements feature (which is retired).
 */
import { useQuery } from '@tanstack/react-query'
import apiClient from '../../../services/apiClient.js'

async function fetchCategories() {
  const response = await apiClient.get('/categories')
  const data = response.data.data
  // Flatten tree if it has children arrays
  if (!Array.isArray(data)) return []
  const flat = []
  for (const cat of data) {
    flat.push({ id: cat.id, name: cat.name, icon: cat.icon, parent_id: cat.parent_id || null })
    if (Array.isArray(cat.children)) {
      for (const child of cat.children) {
        flat.push({ id: child.id, name: child.name, icon: child.icon, parent_id: child.parent_id || cat.id })
      }
    }
  }
  return flat
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}
