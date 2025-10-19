import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RouterBridge from '../src/lib/RouterBridge.jsx';

describe('RouterBridge', () => {
  it('registers a global navigate helper', () => {
    render(
      <MemoryRouter>
        <RouterBridge />
      </MemoryRouter>
    );
    expect(typeof window.__RTX_NAVIGATE__).toBe('function');
  });
});
