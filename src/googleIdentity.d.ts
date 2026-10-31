export {}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (options: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string; error_description?: string }) => void
          }) => { requestAccessToken: () => void }
          revoke: (token: string, callback?: () => void) => void
        }
      }
    }
  }
}