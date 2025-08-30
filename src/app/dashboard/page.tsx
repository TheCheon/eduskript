import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  // Redirect to page-builder as the default dashboard view
  redirect('/dashboard/page-builder')
}
