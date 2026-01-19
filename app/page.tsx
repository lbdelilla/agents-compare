import { loadAgents, loadFeatures, loadAgentFeatureSupport } from '@/lib/data-loader'
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/tables/Table'
import SupportLevelBadge from '@/components/ui/SupportLevelBadge'
import PageContainer from '@/components/layout/PageContainer'
import { CompareSelector } from '@/components/home/CompareSelector'

export default async function HomePage() {
  const agents = await loadAgents()
  const features = await loadFeatures()
  const supportMatrix = await loadAgentFeatureSupport()

  return (
    <PageContainer>
      {/* Hero Section */}
      <section className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
          Compare AI Coding Agents Feature by Feature
        </h1>
                 <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
          Find the perfect AI coding assistant for your needs. Compare agents like Cursor, Windsurf, and Claude Dev across key features including MCP support, context windows, and planning capabilities.
        </p>
        
        {/* Compare Selector */}
        <CompareSelector agents={agents} features={features} />
      </section>

      {/* Preview Comparison Table (3x5) */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">Quick Feature Comparison</h2>
        <Table ariaLabel="Quick comparison of AI coding agents and their feature support">
          <TableHeader>
            <TableRow isHeader>
              <TableCell isHeader scope="col">Agent</TableCell>
              {features.map(feature => (
                <TableCell 
                  key={feature.id} 
                  isHeader 
                  scope="col" 
                  className="min-w-[120px]"
                >
                  {feature.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map(agent => (
              <TableRow key={agent.id} className="group">
                <TableCell className="font-medium">
                  <div>
                    <a 
                      href={`/agent/${agent.id}`}
                      className="font-semibold text-blue-400 hover:text-blue-300 group-hover:text-blue-300 hover:underline group-hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
                    >
                      {agent.name}
                    </a>
                    <div className="text-sm text-gray-400">{agent.provider}</div>
                  </div>
                </TableCell>
                {features.map(feature => {
                  const support = supportMatrix.find(s => s.agent_id === agent.id && s.feature_id === feature.id)
                  const level = support?.support_level || 'unknown'
                  
                  return (
                    <TableCell key={feature.id}>
                      <SupportLevelBadge level={level as 'yes' | 'partial' | 'no' | 'unknown'} showIcon />
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      {/* Quick Links */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">Explore More</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="border border-gray-600 rounded-lg p-6 hover:bg-gray-800/30 transition-colors">
            <h3 className="font-semibold mb-2">Individual Agents</h3>
            <p className="text-sm text-gray-400 mb-4">Detailed profiles for each AI coding agent</p>
            <div className="space-y-2">
              {agents.map(agent => (
                <a key={agent.id} href={`/agent/${agent.id}`} className="block text-sm text-blue-400 hover:underline">
                  {agent.name}
                </a>
              ))}
            </div>
          </div>
          
          <div className="border border-gray-600 rounded-lg p-6 hover:bg-gray-800/30 transition-colors">
            <h3 className="font-semibold mb-2">Features</h3>
            <p className="text-sm text-gray-400 mb-4">Compare agents by specific capabilities</p>
            <div className="space-y-2">
              {features.map(feature => (
                <a key={feature.id} href={`/feature/${feature.id}`} className="block text-sm text-blue-400 hover:underline">
                  {feature.name}
                </a>
              ))}
            </div>
          </div>
          
          <div className="border border-gray-600 rounded-lg p-6 hover:bg-gray-800/30 transition-colors">
            <h3 className="font-semibold mb-2">Direct Comparisons</h3>
            <p className="text-sm text-gray-400 mb-4">Head-to-head agent comparisons</p>
            <div className="space-y-2">
              <a href="/compare/cursor-vs-windsurf" className="block text-sm text-blue-400 hover:underline">
                Cursor vs Windsurf
              </a>
              <a href="/compare/claude-code-vs-cursor" className="block text-sm text-blue-400 hover:underline">
                Claude Dev vs Cursor
              </a>
              <a href="/compare/claude-code-vs-windsurf" className="block text-sm text-blue-400 hover:underline">
                Claude Dev vs Windsurf
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">How It Works</h2>
        <div className="max-w-3xl mx-auto">
          <div className="bg-gray-800/30 border border-gray-600 rounded-lg p-6">
            <p className="text-gray-400 mb-4">
              Our comparison data is sourced from static JSON files maintained in our GitHub repository. 
              This approach ensures transparency, accuracy, and allows the community to contribute through pull requests.
            </p>
            <p className="text-gray-400 mb-4">
              All data is optimized for both human readers and AI agents, with machine-readable JSON endpoints 
              available for programmatic access. The platform is designed with semantic HTML and schema.org 
              structured data for maximum discoverability.
            </p>
            <p className="text-gray-400">
                              <a href="https://github.com/breatheco-de/agents-compare" className="text-blue-400 hover:underline">
                View our GitHub repository
              </a> to see the data sources and contribute updates.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="text-center">
        <div className="max-w-md mx-auto">
          <a 
            href="/compare"
            className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-black bg-white hover:bg-gray-100 transition-colors"
          >
            Start Comparing Agents
          </a>
        </div>
      </section>
    </PageContainer>
  )
} 
