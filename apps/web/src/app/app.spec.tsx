import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'

import App from './app'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

vi.mock('../auth/auth-context', () => ({
  useAuth: () => ({
    user: null,
    setupComplete: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    setup: vi.fn(),
    refreshStatus: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: unknown }) => children,
}))

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(
      <BrowserRouter>
        <MantineProvider>
          <App />
        </MantineProvider>
      </BrowserRouter>
    )
    expect(baseElement).toBeTruthy()
  })

  it('should have a greeting as the title', () => {
    const { getAllByText } = render(
      <BrowserRouter>
        <MantineProvider>
          <App />
        </MantineProvider>
      </BrowserRouter>
    )
    expect(
      getAllByText(new RegExp('Comic Shelf', 'gi')).length > 0
    ).toBeTruthy()
  })
})
