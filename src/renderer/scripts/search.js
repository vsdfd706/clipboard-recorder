// src/renderer/scripts/search.js
import { refreshList } from './list.js';

let filters = {
  search: '',
  type: 'all',
  timeRange: 'all',
};

export function initSearch() {
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  const filterTime = document.getElementById('filter-time');
  const filterType = document.getElementById('filter-type');

  // Search input with debounce
  let searchTimer;
  searchInput.addEventListener('input', () => {
    filters.search = searchInput.value.trim();
    searchClear.style.display = filters.search ? 'block' : 'none';
    clearTimeout(searchTimer);
    searchTimer = setTimeout(refreshList, 200);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    filters.search = '';
    searchClear.style.display = 'none';
    refreshList();
  });

  // Hide clear button initially
  searchClear.style.display = 'none';

  // Filter dropdowns
  filterTime.addEventListener('change', () => {
    filters.timeRange = filterTime.value;
    refreshList();
  });

  filterType.addEventListener('change', () => {
    filters.type = filterType.value;
    refreshList();
  });

  // Ctrl+F to focus search
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });
}

export function getFilters() {
  return { ...filters };
}
