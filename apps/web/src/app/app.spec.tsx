import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';

import App from './app';

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(
      <BrowserRouter>
        <MantineProvider>
          <App />
        </MantineProvider>
      </BrowserRouter>
    );
    expect(baseElement).toBeTruthy();
  });

  it('should have a greeting as the title', () => {
    const { getAllByText } = render(
      <BrowserRouter>
        <MantineProvider>
          <App />
        </MantineProvider>
      </BrowserRouter>
    );
    expect(
      getAllByText(new RegExp('Comic Shelf', 'gi')).length > 0
    ).toBeTruthy();
  });
});
