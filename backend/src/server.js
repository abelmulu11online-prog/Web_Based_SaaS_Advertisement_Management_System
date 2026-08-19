/**
 * server.js — HTTP server entry point.
 * Starts the Express app on the configured port.
 *
 * Implementation will be added in Phase 2 (Backend API Foundation).
 */
import app from './app.js'

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
