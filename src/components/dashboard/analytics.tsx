'use client'

import { BarChart3, Eye, Users, Clock, TrendingUp } from 'lucide-react'

interface AnalyticsData {
  totalViews: number
  uniqueVisitors: number
  avgTimeOnPage: string
  popularPages: {
    title: string
    views: number
    path: string
  }[]
}

// Mock analytics data - in a real app, this would come from an analytics service
const mockAnalytics: AnalyticsData = {
  totalViews: 1247,
  uniqueVisitors: 892,
  avgTimeOnPage: '3m 24s',
  popularPages: [
    { title: 'What are Variables?', views: 324, path: '/algebra-basics/introduction/what-are-variables' },
    { title: 'Using Variables in Expressions', views: 287, path: '/algebra-basics/introduction/using-variables' },
    { title: 'Basic Linear Equations', views: 198, path: '/algebra-basics/solving-equations/basic-equations' },
  ]
}

export function AnalyticsDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-6 h-6" />
        <h2 className="text-2xl font-bold">Analytics Overview</h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Views</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {mockAnalytics.totalViews.toLocaleString()}
              </p>
            </div>
            <Eye className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Unique Visitors</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {mockAnalytics.uniqueVisitors.toLocaleString()}
              </p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Avg. Time on Page</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {mockAnalytics.avgTimeOnPage}
              </p>
            </div>
            <Clock className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Popular Pages */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Most Popular Pages</h3>
        </div>
        <div className="space-y-3">
          {mockAnalytics.popularPages.map((page, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{page.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{page.path}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900 dark:text-white">{page.views}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">views</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
