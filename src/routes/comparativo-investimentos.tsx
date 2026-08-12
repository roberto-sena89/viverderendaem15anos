import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/comparativo-investimentos')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/comparativo-investimentos"!</div>
}
