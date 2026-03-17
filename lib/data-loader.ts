import JSON5 from 'json5'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { Agent, Feature, AgentFeatureSupport, Index } from '@/types'

const DATA_DIR = join(process.cwd(), 'data')

export async function loadIndex(): Promise<Index> {
  const filePath = join(DATA_DIR, 'index.json5')
  const content = readFileSync(filePath, 'utf-8')
  return JSON5.parse(content)
}

export async function loadAgent(id: string): Promise<Agent> {
  const filePath = join(DATA_DIR, 'agents', `${id}.json5`)
  const content = readFileSync(filePath, 'utf-8')
  return JSON5.parse(content)
}

export async function loadFeature(id: string): Promise<Feature> {
  const filePath = join(DATA_DIR, 'features', `${id}.json5`)
  const content = readFileSync(filePath, 'utf-8')
  return JSON5.parse(content)
}

export async function loadAgents(): Promise<Agent[]> {
  const index = await loadIndex()
  const agents = await Promise.all(
    index.agents.map(id => loadAgent(id))
  )
  return agents
}

export async function loadFeatures(): Promise<Feature[]> {
  const index = await loadIndex()
  const features = await Promise.all(
    index.features.map(id => loadFeature(id))
  )
  return features
}

export async function loadAgentFeatureSupport(agentId?: string, featureId?: string): Promise<AgentFeatureSupport[]> {
  const supportDir = join(DATA_DIR, 'support')
  const index = await loadIndex()
  const agents = index.agents

  let allSupport: AgentFeatureSupport[] = []

  // Load support data from each agent's file
  for (const agent of agents) {
    try {
      const filePath = join(supportDir, `${agent}.json5`)
      const content = readFileSync(filePath, 'utf-8')
      const agentSupport = JSON5.parse(content)
      
      // Transform the data structure to match AgentFeatureSupport interface
      for (const support of agentSupport.feature_support) {
        allSupport.push({
          agent_id: agentSupport.agent_id,
          feature_id: support.feature_id,
          support_level: support.support_level,
          notes: support.notes,
          examples: support.examples,
          last_verified: support.last_verified,
          sources: support.sources
        })
      }
    } catch (error) {
      console.error(`Error loading support data for ${agent}:`, error)
    }
  }
  
  // Filter based on parameters
  if (agentId && featureId) {
    return allSupport.filter(s => s.agent_id === agentId && s.feature_id === featureId)
  } else if (agentId) {
    return allSupport.filter(s => s.agent_id === agentId)
  } else if (featureId) {
    return allSupport.filter(s => s.feature_id === featureId)
  }
  
  return allSupport
}

// Feature-specific loaders
export async function getAllFeatures(): Promise<Feature[]> {
  return getCachedData('all-features', loadFeatures)
}

export async function getFeatureBySlug(slug: string): Promise<Feature | null> {
  const features = await getAllFeatures()
  const normalizedSlug = slug.toLowerCase()
  
  // Try exact match first
  const exactMatch = features.find(f => f.id === normalizedSlug)
  if (exactMatch) return exactMatch
  
  // Try case-insensitive match
  return features.find(f => f.id.toLowerCase() === normalizedSlug) || null
}

export async function getFeatureSupport(featureId: string): Promise<Array<{
  agent: Agent
  level: string
  notes?: string
  examples?: string[]
  sources?: string[]
}>> {
  // Get all agents and support data for this feature
  const agents = await loadAgents()
  const supportData = await loadAgentFeatureSupport(undefined, featureId)
  
  // Map support data to include full agent info
  const featureSupport = agents.map(agent => {
    const support = supportData.find(s => s.agent_id === agent.id)
    
    return {
      agent,
      level: support?.support_level || 'unknown',
      notes: support?.notes,
      examples: support?.examples,
      sources: support?.sources
    }
  })
  
  // Sort by support level (yes > partial > no > unknown)
  const levelOrder = { yes: 0, partial: 1, no: 2, unknown: 3 }
  featureSupport.sort((a, b) => {
    const aOrder = levelOrder[a.level as keyof typeof levelOrder] ?? 3
    const bOrder = levelOrder[b.level as keyof typeof levelOrder] ?? 3
    return aOrder - bOrder
  })
  
  return featureSupport
}

// Agent-specific loaders
export async function getAllAgents(): Promise<Agent[]> {
  return getCachedData('all-agents', loadAgents)
}

export async function getAgentBySlug(slug: string): Promise<Agent | null> {
  const agents = await getAllAgents()
  const normalizedSlug = slug.toLowerCase()
  
  // Try exact match first
  const exactMatch = agents.find(a => a.id === normalizedSlug)
  if (exactMatch) return exactMatch
  
  // Try case-insensitive match
  const caseInsensitive = agents.find(a => a.id.toLowerCase() === normalizedSlug)
  if (caseInsensitive) return caseInsensitive
  
  // Try matching against aliases
  return agents.find(a => 
    a.aliases?.some(alias => alias.toLowerCase() === normalizedSlug)
  ) || null
}

export async function getAgentSupport(agentId: string): Promise<Array<{
  feature: Feature
  support: AgentFeatureSupport | undefined
}>> {
  const features = await loadFeatures()
  const supportData = await loadAgentFeatureSupport(agentId)
  
  return features.map(feature => ({
    feature,
    support: supportData.find(s => s.feature_id === feature.id)
  }))
}

// Cache for performance
const cache = new Map()

export function getCachedData<T>(key: string, loader: () => Promise<T>): Promise<T> {
  if (cache.has(key)) {
    return Promise.resolve(cache.get(key))
  }
  
  return loader().then(data => {
    cache.set(key, data)
    return data
  })
} 

// Feature index page specific loader
export async function getAllFeaturesWithStats(): Promise<Array<{
  feature: Feature
  supportStats: {
    totalAgents: number
    supportedCount: number
    partialCount: number
    notSupportedCount: number
    unknownCount: number
  }
}>> {
  const features = await getAllFeatures()
  const agents = await getAllAgents()
  const allSupport = await loadAgentFeatureSupport()
  
  return features.map(feature => {
    const featureSupport = allSupport.filter(s => s.feature_id === feature.id)
    
    const supportStats = {
      totalAgents: agents.length,
      supportedCount: featureSupport.filter(s => s.support_level === 'yes').length,
      partialCount: featureSupport.filter(s => s.support_level === 'partial').length,
      notSupportedCount: featureSupport.filter(s => s.support_level === 'no').length,
      unknownCount: agents.length - featureSupport.length + 
        featureSupport.filter(s => s.support_level === 'unknown').length
    }
    
    return {
      feature,
      supportStats
    }
  })
}

// Get feature categories with counts
export async function getFeatureCategories(): Promise<Array<{
  category: string
  count: number
  description?: string
}>> {
  const features = await getAllFeatures()
  const categoryCounts = new Map<string, number>()
  
  features.forEach(feature => {
    const category = feature.category || 'Other'
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)
  })
  
  // Define category descriptions
  const categoryDescriptions: Record<string, string> = {
    'execution': 'Code execution and runtime capabilities',
    'model': 'AI model support and integration',
    'ide': 'IDE features and integrations',
    'Other': 'Additional capabilities and features'
  }
  
  return Array.from(categoryCounts.entries()).map(([category, count]) => ({
    category,
    count,
    description: categoryDescriptions[category]
  }))
}

// Get featured/popular features
export async function getFeaturedFeatures(): Promise<Feature[]> {
  const features = await getAllFeatures()
  
  // Define featured feature IDs (curated list)
  const featuredIds = [
    'mcp-support',
    'context-window',
    'claude3-support',
    'filesystem-access',
    'planner-strategy'
  ]
  
  return features.filter(f => featuredIds.includes(f.id))
}

// Agent index page specific loader
export async function getAllAgentsWithStats(): Promise<Array<{
  agent: Agent
  supportStats: {
    totalFeatures: number
    supportedCount: number
    partialCount: number
    notSupportedCount: number
    unknownCount: number
    supportPercentage: number
  }
}>> {
  const agents = await getAllAgents()
  const features = await getAllFeatures()
  const allSupport = await loadAgentFeatureSupport()
  
  return agents.map(agent => {
    const agentSupport = allSupport.filter(s => s.agent_id === agent.id)
    
    const supportedCount = agentSupport.filter(s => s.support_level === 'yes').length
    const partialCount = agentSupport.filter(s => s.support_level === 'partial').length
    const notSupportedCount = agentSupport.filter(s => s.support_level === 'no').length
    const unknownCount = features.length - agentSupport.length + 
      agentSupport.filter(s => s.support_level === 'unknown').length
    
    const supportPercentage = features.length > 0 
      ? Math.round(((supportedCount + partialCount * 0.5) / features.length) * 100)
      : 0
    
    const supportStats = {
      totalFeatures: features.length,
      supportedCount,
      partialCount,
      notSupportedCount,
      unknownCount,
      supportPercentage
    }
    
    return {
      agent,
      supportStats
    }
  })
}

// Get agent providers with counts
export async function getAgentProviders(): Promise<Array<{
  provider: string
  count: number
}>> {
  const agents = await getAllAgents()
  const providerCounts = new Map<string, number>()
  
  agents.forEach(agent => {
    const provider = agent.provider || 'Unknown'
    providerCounts.set(provider, (providerCounts.get(provider) || 0) + 1)
  })
  
  return Array.from(providerCounts.entries()).map(([provider, count]) => ({
    provider,
    count
  }))
}

// Get unique IDEs supported across all agents
export async function getSupportedIDEs(): Promise<string[]> {
  const agents = await getAllAgents()
  const ideSet = new Set<string>()
  
  agents.forEach(agent => {
    agent.supported_ide.forEach(ide => ideSet.add(ide))
  })
  
  return Array.from(ideSet).sort()
} 