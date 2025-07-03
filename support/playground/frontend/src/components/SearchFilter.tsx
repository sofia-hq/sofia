import { memo, useState, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Checkbox } from './ui/checkbox';
import type { Node } from '@xyflow/react';

interface SearchFilterProps {
  nodes: Node[];
  onFilter: (filteredNodeIds: string[]) => void;
  onClearFilter: () => void;
}

interface FilterOptions {
  showStepNodes: boolean;
  showToolNodes: boolean;
  showSelectedOnly: boolean;
}

export const SearchFilter = memo(({ nodes, onFilter, onClearFilter }: SearchFilterProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    showStepNodes: true,
    showToolNodes: true,
    showSelectedOnly: false,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Apply search and filter logic
  useEffect(() => {
    let filteredNodes = nodes;

    // Apply type filters
    if (!filterOptions.showStepNodes || !filterOptions.showToolNodes) {
      filteredNodes = filteredNodes.filter(node => {
        if (node.type === 'step' && !filterOptions.showStepNodes) return false;
        if (node.type === 'tool' && !filterOptions.showToolNodes) return false;
        return true;
      });
    }

    // Apply selection filter
    if (filterOptions.showSelectedOnly) {
      filteredNodes = filteredNodes.filter(node => node.selected);
    }

    // Apply search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filteredNodes = filteredNodes.filter(node => {
        const data = node.data as any;

        // Search in different fields based on node type
        if (node.type === 'step') {
          return (
            (data.step_id as string)?.toLowerCase().includes(searchLower) ||
            (data.label as string)?.toLowerCase().includes(searchLower) ||
            (data.description as string)?.toLowerCase().includes(searchLower) ||
            (data.available_tools as string[])?.some((tool: string) => tool.toLowerCase().includes(searchLower))
          );
        } else if (node.type === 'tool') {
          return (
            (data.name as string)?.toLowerCase().includes(searchLower) ||
            (data.description as string)?.toLowerCase().includes(searchLower) ||
            Object.keys(data.parameters || {}).some(param => param.toLowerCase().includes(searchLower))
          );
        }

        return false;
      });
    }

    const filteredNodeIds = filteredNodes.map(node => node.id);

    // Only call onFilter if we have actual filters applied
    if (searchTerm.trim() || !filterOptions.showStepNodes || !filterOptions.showToolNodes || filterOptions.showSelectedOnly) {
      onFilter(filteredNodeIds);
    } else {
      onClearFilter();
    }
  }, [searchTerm, filterOptions, nodes, onFilter, onClearFilter]);

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleClearAll = () => {
    setSearchTerm('');
    setFilterOptions({
      showStepNodes: true,
      showToolNodes: true,
      showSelectedOnly: false,
    });
    onClearFilter();
  };

  const updateFilterOption = (key: keyof FilterOptions, value: boolean) => {
    setFilterOptions(prev => ({ ...prev, [key]: value }));
  };

  const hasActiveFilters = searchTerm.trim() || !filterOptions.showStepNodes || !filterOptions.showToolNodes || filterOptions.showSelectedOnly;
  const selectedCount = nodes.filter(n => n.selected).length;

  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-sm" style={{ backgroundColor: 'var(--background)' }}>
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
        <Input
          type="text"
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-8 h-8"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={handleClearSearch}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Filter Popover */}
      <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Filter className="w-4 h-4" />
            Filter
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                ●
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56" align="end">
          <div className="space-y-3">
            <div className="font-medium text-sm">Filter Options</div>

            {/* Node Type Filters */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Node Types</div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-steps"
                  checked={filterOptions.showStepNodes}
                  onCheckedChange={(checked: boolean) => updateFilterOption('showStepNodes', !!checked)}
                />
                <label htmlFor="show-steps" className="text-sm">
                  Step Nodes ({nodes.filter(n => n.type === 'step').length})
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-tools"
                  checked={filterOptions.showToolNodes}
                  onCheckedChange={(checked: boolean) => updateFilterOption('showToolNodes', !!checked)}
                />
                <label htmlFor="show-tools" className="text-sm">
                  Tool Nodes ({nodes.filter(n => n.type === 'tool').length})
                </label>
              </div>
            </div>

            {/* Selection Filter */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Selection</div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-selected"
                  checked={filterOptions.showSelectedOnly}
                  onCheckedChange={(checked: boolean) => updateFilterOption('showSelectedOnly', !!checked)}
                  disabled={selectedCount === 0}
                />
                <label htmlFor="show-selected" className="text-sm">
                  Selected Only ({selectedCount})
                </label>
              </div>
            </div>

            {/* Clear All Button */}
            {hasActiveFilters && (
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleClearAll}
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Indicator */}
      {hasActiveFilters && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {searchTerm && <span>Search: "{searchTerm}"</span>}
          {(!filterOptions.showStepNodes || !filterOptions.showToolNodes || filterOptions.showSelectedOnly) && (
            <span className="ml-2">Filtered</span>
          )}
        </div>
      )}
    </div>
  );
});

SearchFilter.displayName = 'SearchFilter';
