import { useId, useRef, useState, type KeyboardEvent } from 'react';
import type { Location } from '../types/location';
import { useCitySearch } from '../hooks/useCitySearch';
import { es } from '../i18n/es';

interface CitySearchProps {
  activeLocation: Location | null;
  onSelectLocation: (location: Location) => void;
  title?: string;
  headingLevel?: 1 | 2 | 3;
}

function presentPart(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function formatLocationName(location: Location): string {
  return [location.name, location.admin1, location.country].filter(presentPart).join(', ');
}

export function CitySearch({ activeLocation, onSelectLocation, title = es.citySearch.title, headingLevel = 1 }: CitySearchProps) {
  const { query, setQuery, setDisplayQuery, state, validationMessage, retry } = useCitySearch();
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dismissedQuery, setDismissedQuery] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const uniqueId = useId();
  const inputId = `city-search-${uniqueId}-input`;
  const listboxId = `city-search-${uniqueId}-listbox`;
  const helpId = `${inputId}-help`;
  const validationId = `${inputId}-validation`;
  const results = state.status === 'success' ? state.results : [];
  const listVisible = results.length > 0 && state.status === 'success' && dismissedQuery !== state.query;
  const validActiveIndex = listVisible && activeIndex >= 0 && activeIndex < results.length ? activeIndex : -1;
  const activeDescendant = validActiveIndex >= 0 ? `${listboxId}-option-${validActiveIndex}` : undefined;
  const describedBy = validationMessage ? `${helpId} ${validationId}` : helpId;
  const Heading = `h${headingLevel}` as const;

  function selectLocation(location: Location) {
    onSelectLocation(location);
    setActiveIndex(-1);
    setDismissedQuery(null);
    setDisplayQuery(formatLocationName(location));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || composingRef.current) return;
    if (results.length === 0 || state.status !== 'success') {
      if (event.key === 'Escape' && state.status === 'success') {
        setActiveIndex(-1);
        setDismissedQuery(state.query);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setDismissedQuery(null);
      setActiveIndex((current) => current < 0 ? 0 : (current + 1) % results.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setDismissedQuery(null);
      setActiveIndex((current) => current < 0 ? results.length - 1 : (current - 1 + results.length) % results.length);
      return;
    }

    if (event.key === 'Enter' && listVisible && validActiveIndex >= 0) {
      event.preventDefault();
      selectLocation(results[validActiveIndex]!);
      return;
    }

    if (event.key === 'Escape' && listVisible) {
      event.preventDefault();
      setActiveIndex(-1);
      setDismissedQuery(state.query);
    }
  }

  function handleInputChange(value: string) {
    setActiveIndex(-1);
    setDismissedQuery(null);
    setQuery(value);
  }

  return (
    <section className="city-search" aria-labelledby={`${inputId}-title`}>
      <Heading id={`${inputId}-title`}>{title}</Heading>
      <label className="city-search__label" htmlFor={inputId}>{es.citySearch.label}</label>
      <div className="city-search__field">
        <input
          ref={inputRef}
          id={inputId}
          className="city-search__input"
          type="text"
          role="combobox"
          value={query}
          maxLength={100}
          autoComplete="off"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={listVisible}
          aria-controls={listVisible ? listboxId : undefined}
          aria-activedescendant={activeDescendant}
          aria-describedby={describedBy}
          onChange={(event) => {
            if (composingRef.current) setDisplayQuery(event.currentTarget.value);
            else handleInputChange(event.currentTarget.value);
          }}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={(event) => { composingRef.current = false; handleInputChange(event.currentTarget.value); }}
        />
        {query.length > 0 && <button className="city-search__clear" type="button" aria-label={es.citySearch.clear} onClick={() => { handleInputChange(''); inputRef.current?.focus(); }}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
        </button>}
      </div>
      <p className="city-search__help" id={helpId}>{es.citySearch.help}</p>
      {validationMessage && <p className="city-search__validation" id={validationId} role="status">{validationMessage}</p>}

      {state.status === 'loading' && <p className="city-search__status" role="status" aria-live="polite">{es.citySearch.loading}</p>}
      {listVisible && (
        <div className="city-search__results">
          <p className="city-search__status" role="status" aria-live="polite">{es.citySearch.found(results.length)}</p>
          <ul className="city-search__listbox" id={listboxId} role="listbox" aria-label={es.citySearch.listLabel}>
            {results.map((location, index) => (
              <li
                className="city-search__option"
                data-active={index === validActiveIndex || undefined}
                id={`${listboxId}-option-${index}`}
                key={location.id}
                role="option"
                aria-selected={activeLocation?.id === location.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectLocation(location)}
              >
                <span className="city-search__option-name">{location.name}</span>
                <span className="city-search__option-region">{[location.admin1, location.country].filter(presentPart).join(', ') || es.citySearch.regionUnavailable}</span>
                <span className="city-search__option-coordinates">{location.latitude.toFixed(2)}, {location.longitude.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {state.status === 'empty' && (
        <p className="city-search__status" role="status" aria-live="polite">
          {es.citySearch.empty(state.query)}
        </p>
      )}
      {state.status === 'error' && (
        <div className="city-search__error" role="alert">
          <span>{state.error.message}</span>
          <button className="city-search__retry" type="button" onClick={retry}>{es.common.retry}</button>
        </div>
      )}
    </section>
  );
}
