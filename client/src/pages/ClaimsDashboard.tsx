import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, TrendingUp, Clock, Users, ArrowUp, ArrowDown, BarChart3, AlertCircle } from 'lucide-react';
import { fetchDashboardData, DashboardData } from '@/services/claimsService';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down';
}

const MetricCard = ({ title, value, subtitle, icon, trend }: MetricCardProps) => (
  <Card className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      {icon && <div className="text-gray-400">{icon}</div>}
    </CardHeader>
    <CardContent>
      <div className="flex items-baseline gap-2">
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        {trend && (
          <div className={`flex items-center text-sm ${trend === 'up' ? 'text-red-600' : 'text-green-600'}`}>
            {trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </CardContent>
  </Card>
);

const ClaimsDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Load dashboard data
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchDashboardData();
        setDashboardData(data);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    
    // Refresh data every 30 seconds
    const refreshInterval = setInterval(loadData, 30000);
    return () => clearInterval(refreshInterval);
  }, []);

  if (loading || !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const { metrics, criticalClaims, visibilityGaps, regionDelays, dataIntegrity, compliance } = dashboardData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <span className="text-blue-900 font-bold text-xl">VA</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">VA Claims Command Center</h1>
                <p className="text-blue-200 text-sm">Real-time Veteran Benefits Processing & Claims Management</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-blue-200">LAST UPDATED</div>
              <div className="text-lg font-semibold">{currentTime.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Critical Alert */}
        <Alert className="border-l-4 border-l-red-600 bg-red-50 border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertDescription className="ml-2 text-red-900">
            <strong>CRITICAL: Claim Processing Delays</strong>
            <br />
            Average claim cycle time increased from 7 to {metrics.avgCycleTime.toFixed(1)} hours. {metrics.veteranImpact.toLocaleString()} disability packages remain in processing beyond cycle window.
          </AlertDescription>
        </Alert>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Claim Cycle Time"
            value={`${metrics.avgCycleTime.toFixed(1)}h`}
            subtitle={`+${(metrics.avgCycleTime - 7).toFixed(1)}h To Baseline`}
            icon={<Clock className="w-5 h-5" />}
            trend={metrics.avgCycleTime > 7 ? "up" : "down"}
          />
          <MetricCard
            title="Active Claims"
            value={metrics.activeClaims.toString()}
            subtitle="Requiring Action"
            icon={<AlertTriangle className="w-5 h-5" />}
          />
          <MetricCard
            title="Processing Rate"
            value={`${metrics.processingRate.toFixed(0)}%`}
            subtitle="Claims met within SLA target"
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <MetricCard
            title="Veteran Impact"
            value={`${(metrics.veteranImpact / 1000).toFixed(0)}K`}
            subtitle="Total Veterans on Backlog List"
            icon={<Users className="w-5 h-5" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Critical Claims Section */}
          <Card className="bg-white border border-gray-200">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                <CardTitle className="text-lg font-semibold text-gray-900">Critical Claims Backlog</CardTitle>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Claims with extended turnaround periods impacting veteran care
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {criticalClaims.map((item, idx) => (
                  <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <Badge variant="destructive" className="ml-2">{item.days} days</Badge>
                    </div>
                    <div className="text-sm text-gray-600">{item.affected.toLocaleString()} veterans affected</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Claims Tracking & Visibility */}
          <Card className="bg-white border border-gray-200">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <CardTitle className="text-lg font-semibold text-gray-900">Claims Processing Visibility</CardTitle>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Real-time visibility metrics for critical locations
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* DSCSA Compliance Section */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Claims Data Integrity</span>
                  <span className="text-sm font-bold text-red-600">{dataIntegrity.toFixed(1)}%</span>
                </div>
                <Progress value={dataIntegrity} className="h-3" />
                <p className="text-xs text-red-600 mt-1">{(100 - dataIntegrity).toFixed(1)}% missing on-order</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Evidence Completeness Rate</span>
                  <span className="text-sm font-bold text-green-600">{compliance.toFixed(1)}%</span>
                </div>
                <Progress value={compliance} className="h-3 [&>div]:bg-green-600" />
                <p className="text-xs text-green-600 mt-1">{(100 - compliance).toFixed(1)}% claims require additional documentation</p>
              </div>

              {/* Visibility Gaps */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <h4 className="font-semibold text-gray-900">Claims Visibility Gaps</h4>
                </div>
                <p className="text-xs text-gray-600 mb-3">Notable areas impacted by missing tracking information</p>
                
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-gray-700 pb-2 border-b border-gray-200 sticky top-0 bg-white">
                    <div>Provider</div>
                    <div>Claim Type</div>
                    <div>Region</div>
                    <div className="text-right">Delay (Hrs)</div>
                  </div>
                  {visibilityGaps.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2 text-xs py-2 hover:bg-gray-50 rounded">
                      <div className="text-gray-900 truncate">{item.provider}</div>
                      <div className="text-gray-700 truncate">{item.product}</div>
                      <div className="text-gray-600 truncate">{item.region}</div>
                      <div className="text-right font-semibold text-red-600">{item.delay}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Regional Delays */}
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Average Delay Hours by Region</h4>
                <div className="space-y-3">
                  {regionDelays.map((region, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{region.name}</span>
                        <div className="flex gap-4">
                          <span className="text-blue-600">● Normal: {region.normal}%</span>
                          <span className="text-red-600">● {'>'}{region.delayed}hrs</span>
                        </div>
                      </div>
                      <div className="relative h-6 bg-gray-200 rounded overflow-hidden">
                        <div 
                          className="absolute left-0 h-full bg-blue-600"
                          style={{ width: `${region.normal}%` }}
                        />
                        <div 
                          className="absolute right-0 h-full bg-red-600"
                          style={{ width: `${region.delayed}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Priority Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-blue-900">Enforcement Readiness</CardTitle>
              <p className="text-sm text-blue-700 mt-1">
                Accelerate compliance enforcement for data quality standards
              </p>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold"
                onClick={() => {
                  const subject = encodeURIComponent('URGENT: Deploy Resources for Enforcement Readiness');
                  const body = encodeURIComponent(
                    `Dear Team,\n\n` +
                    `CRITICAL ACTION REQUIRED - Enforcement Readiness\n\n` +
                    `Current Status:\n` +
                    `• Average Claim Cycle Time: ${metrics.avgCycleTime.toFixed(1)} hours (+${(metrics.avgCycleTime - 7).toFixed(1)}h above baseline)\n` +
                    `• Active Claims Requiring Action: ${metrics.activeClaims.toLocaleString()}\n` +
                    `• Processing Rate: ${metrics.processingRate.toFixed(0)}% (Below 80% SLA target)\n` +
                    `• Veterans Impacted: ${metrics.veteranImpact.toLocaleString()}\n\n` +
                    `ACTION NEEDED:\n` +
                    `Accelerate compliance enforcement for data quality standards to improve claim processing efficiency.\n\n` +
                    `Please review the attached dashboard data and prepare resource deployment plan.\n\n` +
                    `Dashboard: http://localhost:5174\n\n` +
                    `Best regards,\n` +
                    `VA Claims Command Center`
                  );
                  window.location.href = `mailto:?subject=${subject}&body=${body}`;
                }}
              >
                Deploy Resources
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-green-900">Regional Coordination</CardTitle>
              <p className="text-sm text-green-700 mt-1">
                Direct regional assistance to improve claim processing quality
              </p>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold"
                onClick={() => {
                  const subject = encodeURIComponent('ACTION REQUIRED: Regional Coordination for Claims Processing');
                  const body = encodeURIComponent(
                    `Dear Regional Coordinators,\n\n` +
                    `IMMEDIATE ATTENTION - Regional Coordination Required\n\n` +
                    `Critical Claims Backlog Summary:\n` +
                    criticalClaims.slice(0, 5).map((claim, i) => 
                      `${i + 1}. ${claim.name}: ${claim.affected.toLocaleString()} veterans affected (${claim.days} days delayed)`
                    ).join('\n') +
                    `\n\n` +
                    `Regional Performance:\n` +
                    regionDelays.slice(0, 3).map((region, i) => 
                      `${i + 1}. ${region.name}: ${region.delayed.toFixed(1)}% of claims delayed beyond 24 hours`
                    ).join('\n') +
                    `\n\n` +
                    `ACTION NEEDED:\n` +
                    `Direct regional assistance to improve claim processing quality and reduce veteran wait times.\n\n` +
                    `Please initiate outreach to underperforming regions and coordinate support resources.\n\n` +
                    `Dashboard: http://localhost:5174\n\n` +
                    `Best regards,\n` +
                    `VA Claims Command Center`
                  );
                  window.location.href = `mailto:?subject=${subject}&body=${body}`;
                }}
              >
                Initiate Outreach
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-purple-900">Claims Analytics & Insights</CardTitle>
              <p className="text-sm text-purple-700 mt-1">
                Deploy predictive models for claims outcomes and appeal forecasting
              </p>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full bg-purple-700 hover:bg-purple-800 text-white font-semibold">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-purple-900">Claims Analytics Drill-Down</DialogTitle>
                    <DialogDescription>
                      Problematic areas requiring immediate attention and predictive insights
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 mt-4">
                    {/* Critical Bottlenecks */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        Critical Processing Bottlenecks
                      </h3>
                      <div className="space-y-2">
                        {regionDelays.map((region, idx) => (
                          <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-semibold text-gray-900">{region.name}</div>
                                <div className="text-sm text-gray-600">
                                  {region.delayed.toFixed(1)}% of claims exceed 24hr SLA
                                </div>
                              </div>
                              <Badge variant={region.delayed > 60 ? "destructive" : "default"}>
                                {region.delayed > 60 ? 'Critical' : 'Warning'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                              <div>
                                <span className="text-gray-500">Avg Delay:</span>
                                <span className="font-semibold text-red-600 ml-1">
                                  {(region.delayed * 0.8).toFixed(1)}hrs
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Est. Veterans:</span>
                                <span className="font-semibold ml-1">
                                  {Math.round((metrics.veteranImpact * region.delayed) / 600).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Priority:</span>
                                <span className="font-semibold text-orange-600 ml-1">High</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Claim Type Analysis */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">High-Risk Claim Categories</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {criticalClaims.slice(0, 6).map((claim, idx) => (
                          <div key={idx} className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-lg border border-orange-200">
                            <div className="font-semibold text-gray-900 text-sm mb-1">{claim.name}</div>
                            <div className="flex justify-between items-end">
                              <div>
                                <div className="text-xs text-gray-600">Backlog</div>
                                <div className="text-lg font-bold text-orange-700">{claim.affected.toLocaleString()}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-600">Avg Days</div>
                                <div className="text-lg font-bold text-red-600">{claim.days}</div>
                              </div>
                            </div>
                            <div className="mt-2 text-xs">
                              <span className="text-gray-600">Appeal Risk: </span>
                              <span className="font-semibold text-orange-700">
                                {((claim.days / 30) * 15).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Predictive Insights */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Predictive Insights & Recommendations</h3>
                      <div className="space-y-2">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="flex items-start gap-3">
                            <TrendingUp className="w-5 h-5 text-blue-600 mt-1" />
                            <div>
                              <div className="font-semibold text-blue-900">Disability Claims Surge Expected</div>
                              <div className="text-sm text-blue-700 mt-1">
                                Model predicts 18% increase in disability compensation claims next quarter. 
                                Recommend staffing increase in Southeast and South Central regions.
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-purple-600 mt-1" />
                            <div>
                              <div className="font-semibold text-purple-900">Evidence Gaps Correlation</div>
                              <div className="text-sm text-purple-700 mt-1">
                                Claims missing medical nexus letters have 65% higher appeal rate. 
                                Implementing AI-powered evidence completeness checks could reduce appeals by 22%.
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <div className="flex items-start gap-3">
                            <Users className="w-5 h-5 text-green-600 mt-1" />
                            <div>
                              <div className="font-semibold text-green-900">Examiner Performance Optimization</div>
                              <div className="text-sm text-green-700 mt-1">
                                Matching examiners to claim specialties reduces processing time by 32%. 
                                Recommend AI-driven assignment system for optimal throughput.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Items */}
                    <div className="bg-gradient-to-r from-purple-100 to-purple-50 p-4 rounded-lg border border-purple-300">
                      <h3 className="text-lg font-semibold text-purple-900 mb-3">Recommended Actions</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                          <span>Deploy additional examiners to Southeast (Atlanta) and South Central (Houston) regions</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                          <span>Implement evidence completeness AI screening for all disability compensation claims</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                          <span>Initiate proactive outreach to veterans with claims over 21 days old</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                          <span>Review and optimize examiner specialty assignments using ML model</span>
                        </div>
                      </div>
                    </div>

                    {/* Email Button */}
                    <Button 
                      className="w-full bg-purple-700 hover:bg-purple-800 text-white font-semibold"
                      onClick={() => {
                        const subject = encodeURIComponent('PRIORITY: Claims Analytics Insights & Action Plan');
                        const body = encodeURIComponent(
                          `Dear Claims Analytics Team,\n\n` +
                          `STRATEGIC INITIATIVE - Claims Intelligence & Predictive Modeling\n\n` +
                          `CRITICAL BOTTLENECKS IDENTIFIED:\n` +
                          regionDelays.slice(0, 3).map((region, i) => 
                            `${i + 1}. ${region.name}: ${region.delayed.toFixed(1)}% claims exceed SLA`
                          ).join('\n') +
                          `\n\n` +
                          `HIGH-RISK CLAIM CATEGORIES:\n` +
                          criticalClaims.slice(0, 5).map((claim, i) => 
                            `${i + 1}. ${claim.name}: ${claim.affected.toLocaleString()} veterans, ${claim.days} days avg`
                          ).join('\n') +
                          `\n\n` +
                          `PREDICTIVE INSIGHTS:\n` +
                          `• 18% surge in disability claims predicted next quarter\n` +
                          `• Evidence gaps correlate with 65% higher appeal rate\n` +
                          `• Specialty matching reduces processing time by 32%\n\n` +
                          `RECOMMENDED ACTIONS:\n` +
                          `1. Deploy additional examiners to high-delay regions\n` +
                          `2. Implement AI evidence completeness screening\n` +
                          `3. Proactive veteran outreach for delayed claims\n` +
                          `4. Optimize examiner-claim specialty matching\n\n` +
                          `Please review full analytics dashboard: http://localhost:5174\n\n` +
                          `Best regards,\n` +
                          `VA Claims Command Center`
                        );
                        window.location.href = `mailto:?subject=${subject}&body=${body}`;
                      }}
                    >
                      Email Analytics Report
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClaimsDashboard;

