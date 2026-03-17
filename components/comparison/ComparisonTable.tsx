'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import SupportLevelBadge from '@/components/ui/SupportLevelBadge'
import { ComparisonCellModal } from './ComparisonCellModal'
import type { Agent, Feature, AgentFeatureSupport, SupportLevel } from '@/types'
import type { ComparisonMatrix } from '@/types/comparison'

interface ComparisonTableProps {
  agents: Agent[]
  features: Feature[]
  matrix: ComparisonMatrix['matrix']
  viewMode: 'compact' | 'expanded'
  showNotes: boolean
  selectedSupportLevels: SupportLevel[]
  supportMatrix?: AgentFeatureSupport[]
  filters?: {
    searchTerm: string
    selectedAgents: string[]
    selectedFeatures: string[]
    selectedCategories: string[]
    supportLevels: string[]
    showUnknown: boolean
  }
}

interface GroupedFeatures {
  [category: string]: Feature[]
}

export function ComparisonTable({ 
  agents, 
  features, 
  matrix,
  viewMode,
  showNotes,
  selectedSupportLevels,
  supportMatrix: providedSupportMatrix,
  filters 
}: ComparisonTableProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [selectedCell, setSelectedCell] = useState<{
    agent: Agent
    feature: Feature
    support: AgentFeatureSupport | null
  } | null>(null)

  // Convert matrix to supportMatrix if not provided
  const supportMatrix = providedSupportMatrix || (() => {
    const result: AgentFeatureSupport[] = []
    for (const agentId in matrix) {
      for (const featureId in matrix[agentId]) {
        const support = matrix[agentId][featureId]
        result.push({
          agent_id: agentId,
          feature_id: featureId,
          support_level: support.level,
          notes: support.notes || '',
          examples: support.examples || [],
          last_verified: '',
          sources: []
        })
      }
    }
    return result
  })()

  // Group features by category
  const groupedFeatures: GroupedFeatures = useMemo(() => {
    return features.reduce((acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = []
      }
      acc[feature.category].push(feature)
      return acc
    }, {} as GroupedFeatures)
  }, [features])

  // Filter agents and features based on filters
  const filteredAgents = useMemo(() => {
    if (!filters) return agents
    
    let filtered = agents
    
    if (filters.selectedAgents.length > 0) {
      filtered = filtered.filter(agent => filters.selectedAgents.includes(agent.id))
    }
    
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(agent => 
        agent.name.toLowerCase().includes(term) ||
        agent.description.toLowerCase().includes(term) ||
        agent.provider.toLowerCase().includes(term)
      )
    }
    
    return filtered
  }, [agents, filters])

  const filteredFeatures = useMemo(() => {
    if (!filters) return features
    
    let filtered = features
    
    if (filters.selectedFeatures.length > 0) {
      filtered = filtered.filter(feature => filters.selectedFeatures.includes(feature.id))
    }
    
    if (filters.selectedCategories.length > 0) {
      filtered = filtered.filter(feature => filters.selectedCategories.includes(feature.category))
    }
    
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(feature => 
        feature.name.toLowerCase().includes(term) ||
        feature.description.toLowerCase().includes(term) ||
        feature.category.toLowerCase().includes(term)
      )
    }
    
    return filtered
  }, [features, filters])

  // Get support data for a specific agent-feature combination
  const getSupport = (agentId: string, featureId: string): AgentFeatureSupport | null => {
    return supportMatrix.find(s => s.agent_id === agentId && s.feature_id === featureId) || null
  }

  // Calculate support statistics for an agent
  const getAgentStats = (agentId: string) => {
    const agentSupport = supportMatrix.filter(s => s.agent_id === agentId)
    const total = filteredFeatures.length
    const supported = agentSupport.filter(s => s.support_level === 'yes').length
    const partial = agentSupport.filter(s => s.support_level === 'partial').length
    const percentage = Math.round((supported + partial * 0.5) / total * 100)
    
    return { total, supported, partial, percentage }
  }

  // Calculate support statistics for a feature
  const getFeatureStats = (featureId: string) => {
    const featureSupport = supportMatrix.filter(s => s.feature_id === featureId)
    const total = filteredAgents.length
    const supported = featureSupport.filter(s => s.support_level === 'yes').length
    const partial = featureSupport.filter(s => s.support_level === 'partial').length
    
    return { total, supported, partial }
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const openCellModal = (agent: Agent, feature: Feature) => {
    const support = getSupport(agent.id, feature.id)
    setSelectedCell({ agent, feature, support })
  }

  // Initially expand all categories
  useMemo(() => {
    setExpandedCategories(new Set(Object.keys(groupedFeatures)))
  }, [groupedFeatures])

  return (
    <>
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Table Header */}
            <thead className="bg-gray-700 sticky top-0 z-10">
              <tr>
                <th className="sticky left-0 z-20 bg-gray-700 px-6 py-4 text-left text-sm font-medium text-gray-300 border-r border-gray-600 min-w-[280px]">
                  Feature
                </th>
                {filteredAgents.map(agent => {
                  const stats = getAgentStats(agent.id)
                  return (
                    <th key={agent.id} className="px-4 py-4 text-center text-sm font-medium text-gray-300 border-r border-gray-600 min-w-[120px]">
                      <Link 
                        href={`/agent/${agent.id}`}
                        className="block hover:text-blue-400 transition-colors"
                      >
                        <div className="font-semibold">{agent.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{agent.provider}</div>
                        <div className="text-xs text-green-400 mt-1">{stats.percentage}%</div>
                      </Link>
                    </th>
                  )
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => {
                const filteredCategoryFeatures = categoryFeatures.filter(feature => 
                  filteredFeatures.includes(feature)
                )
                
                if (filteredCategoryFeatures.length === 0) return null
                
                const isExpanded = expandedCategories.has(category)
                
                return (
                  <React.Fragment key={category}>
                    {/* Category Header */}
                    <tr className="bg-gray-750">
                      <td 
                        className="sticky left-0 z-10 bg-gray-750 px-6 py-3 text-sm font-medium text-gray-200 border-r border-gray-600 cursor-pointer"
                        onClick={() => toggleCategory(category)}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                          <span>{category}</span>
                          <span className="text-xs text-gray-400">({filteredCategoryFeatures.length})</span>
                        </div>
                      </td>
                      {filteredAgents.map(agent => (
                        <td key={agent.id} className="px-4 py-3 border-r border-gray-600"></td>
                      ))}
                    </tr>

                    {/* Feature Rows */}
                    {isExpanded && filteredCategoryFeatures.map(feature => {
                      const stats = getFeatureStats(feature.id)
                      
                      return (
                        <tr key={feature.id} className="hover:bg-gray-750 transition-colors">
                          <td className="sticky left-0 z-10 bg-gray-800 hover:bg-gray-750 px-6 py-4 text-sm text-gray-300 border-r border-gray-600">
                            <Link 
                              href={`/feature/${feature.id}`}
                              className="block hover:text-blue-400 transition-colors"
                            >
                              <div className="font-medium">{feature.name}</div>
                              <div className="text-xs text-gray-400 mt-1">{feature.description}</div>
                              <div className="text-xs text-green-400 mt-1">
                                {stats.supported + stats.partial}/{stats.total} agents
                              </div>
                            </Link>
                          </td>
                          {filteredAgents.map(agent => {
                            const support = getSupport(agent.id, feature.id)
                            const supportLevel = support?.support_level || 'unknown'
                            
                            // Apply support level filter
                            if (filters && !filters.supportLevels.includes(supportLevel)) {
                              return <td key={agent.id} className="px-4 py-4 border-r border-gray-600"></td>
                            }
                            
                            return (
                              <td 
                                key={agent.id} 
                                className="px-4 py-4 text-center border-r border-gray-600 cursor-pointer hover:bg-gray-700 transition-colors"
                                onClick={() => openCellModal(agent, feature)}
                              >
                                <SupportLevelBadge 
                                  level={supportLevel as SupportLevel}
                                  showIcon={true}
                                />
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cell Detail Modal */}
      {selectedCell && (
        <ComparisonCellModal
          agent={selectedCell.agent}
          feature={selectedCell.feature}
          support={selectedCell.support}
          onClose={() => setSelectedCell(null)}
        />
      )}
    </>
  )
} 