// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';

afterEach(cleanup);

describe('estructura principal', () => {
  it('ofrece un enlace de salto al contenido principal con un destino existente', () => {
    render(<App />);
    const link = screen.getByRole('link', { name: 'Saltar al contenido' });
    expect(link.getAttribute('href')).toBe('#main-content');
    const main = screen.getByRole('main');
    expect(main.id).toBe('main-content');
    expect(main.getAttribute('tabindex')).toBe('-1');
  });
});
