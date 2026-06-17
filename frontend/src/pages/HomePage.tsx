import HealthStatus from '../features/health/HealthStatus'
import ShortenForm from '../features/links/ShortenForm'
import MyLinksPage from './MyLinksPage'

// The Layout provides the page chrome (header/main); HomePage is just the body:
// shorten a URL, then see it appear in your links list.
export default function HomePage() {
  return (
    <>
      <div className="w-full max-w-xl">
        <ShortenForm />
      </div>
      <MyLinksPage />
      <HealthStatus />
    </>
  )
}
