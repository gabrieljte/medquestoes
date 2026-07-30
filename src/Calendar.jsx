import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'medquiz-academic-calendar-v1';

const CATEGORIES = [
  'Horário de aulas',
  'Provas',
  'Atividades',
  'Ambulatórios',
  'Extracurriculares',
];

const CATEGORY_META = {
  'Horário de aulas': { icon: '🎓', slug: 'aulas' },
  Provas: { icon: '📝', slug: 'provas' },
  Atividades: { icon: '✅', slug: 'atividades' },
  Ambulatórios: { icon: '🩺', slug: 'ambulatorios' },
  Extracurriculares: { icon: '⭐', slug: 'extracurriculares' },
};

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const WEEKDAY_OPTIONS = [
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
  { label: 'Dom', value: 0 },
];

const EMPTY_FORM = {
  title: '',
  category: CATEGORIES[0],
  date: '',
  startTime: '08:00',
  endTime: '09:00',
  description: '',
  weekly: false,
  repeatWeekdays: [],
  repeatUntil: '',
};

function dateToKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function keyToDate(key) {
  const [year, month, day] = String(key).split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() + amount);
  return result;
}

function startOfWeek(date) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  return result;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
}

function shiftMonth(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12, 0, 0, 0);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatMonth(date) {
  return capitalize(
    new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
    }).format(date),
  );
}

function formatShortDate(key) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
    .format(keyToDate(key))
    .replace('.', '');
}

function formatLongDate(key) {
  return capitalize(
    new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(keyToDate(key)),
  );
}

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeEvent(event) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(event.date || '')
    ? event.date
    : dateToKey(new Date());
  const repeatWeekdays = Array.isArray(event.repeatWeekdays)
    ? [...new Set(event.repeatWeekdays.map(Number).filter((day) => day >= 0 && day <= 6))]
    : [];
  const weekly = Boolean(event.weekly);
  return {
    id: String(event.id || makeId()),
    title: String(event.title || ''),
    category: CATEGORIES.includes(event.category) ? event.category : CATEGORIES[0],
    date,
    startTime: String(event.startTime || '08:00'),
    endTime: String(event.endTime || '09:00'),
    description: String(event.description || ''),
    weekly,
    repeatWeekdays: weekly && repeatWeekdays.length
      ? repeatWeekdays
      : weekly
        ? [keyToDate(date).getDay()]
        : [],
    repeatUntil: /^\d{4}-\d{2}-\d{2}$/.test(event.repeatUntil || '')
      ? event.repeatUntil
      : '',
    completed: Boolean(event.completed),
    completedDates: Array.isArray(event.completedDates)
      ? event.completedDates.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item))
      : [],
    createdAt: event.createdAt || new Date().toISOString(),
  };
}

function loadEvents() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.map(normalizeEvent) : [];
  } catch {
    return [];
  }
}

function occursOn(event, dateKey) {
  if (!event.weekly) return event.date === dateKey;
  if (dateKey < event.date) return false;
  if (event.repeatUntil && dateKey > event.repeatUntil) return false;
  const weekdays = event.repeatWeekdays?.length
    ? event.repeatWeekdays
    : [keyToDate(event.date).getDay()];
  return weekdays.includes(keyToDate(dateKey).getDay());
}

function isOccurrenceCompleted(event, occurrenceDate) {
  if (event.weekly) return event.completedDates.includes(occurrenceDate);
  return event.completed;
}

function sortOccurrences(a, b) {
  return (
    a.startTime.localeCompare(b.startTime) ||
    a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' })
  );
}

function eventsForDate(events, dateKey, activeCategories) {
  return events
    .filter((event) => activeCategories.has(event.category) && occursOn(event, dateKey))
    .map((event) => ({ ...event, occurrenceDate: dateKey }))
    .sort(sortOccurrences);
}

function repeatSummary(event) {
  const labels = WEEKDAY_OPTIONS
    .filter((weekday) => event.repeatWeekdays?.includes(weekday.value))
    .map((weekday) => weekday.label);
  return labels.length ? `↻ ${labels.join(', ')}` : '↻ Semanal';
}

function CalendarEventCard({ event, compact = false, onToggle, onEdit, onDelete }) {
  const completed = isOccurrenceCompleted(event, event.occurrenceDate);
  const meta = CATEGORY_META[event.category];

  return (
    <article
      className={[
        'calendar-event',
        `calendar-event--${meta.slug}`,
        compact ? 'calendar-event--compact' : '',
        completed ? 'calendar-event--completed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className="calendar-event__check"
        onClick={(clickEvent) => {
          clickEvent.stopPropagation();
          onToggle(event);
        }}
        aria-label={completed ? 'Marcar como pendente' : 'Marcar como concluído'}
        title={completed ? 'Marcar como pendente' : 'Marcar como concluído'}
      >
        {completed ? '✓' : ''}
      </button>

      <div className="calendar-event__content">
        <div className="calendar-event__topline">
          <span className="calendar-event__time">
            {event.startTime}–{event.endTime}
          </span>
          {event.weekly && <span className="calendar-event__repeat">{repeatSummary(event)}</span>}
        </div>
        <strong className="calendar-event__title">{event.title}</strong>
        {!compact && (
          <>
            <span className="calendar-event__category">
              {meta.icon} {event.category}
            </span>
            {event.description && (
              <p className="calendar-event__description">{event.description}</p>
            )}
          </>
        )}
      </div>

      {!compact && (
        <div className="calendar-event__actions">
          <button type="button" onClick={() => onEdit(event)} aria-label={`Editar ${event.title}`}>
            Editar
          </button>
          <button
            type="button"
            className="calendar-event__delete"
            onClick={() => onDelete(event)}
            aria-label={`Excluir ${event.title}`}
          >
            Excluir
          </button>
        </div>
      )}
    </article>
  );
}

export default function Calendar() {
  const todayKey = dateToKey(new Date());
  const [events, setEvents] = useState(loadEvents);
  const [weekCursor, setWeekCursor] = useState(() => startOfWeek(new Date()));
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [activeCategories, setActiveCategories] = useState(() => new Set(CATEGORIES));
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, date: todayKey }));
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      // O calendário continua utilizável mesmo se o navegador bloquear o armazenamento.
    }
  }, [events]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekCursor, index)),
    [weekCursor],
  );

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(monthCursor);
    const gridStart = startOfWeek(monthStart);
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  }, [monthCursor]);

  const visibleCategorySet = activeCategories;
  const filteredEvents = useMemo(() => {
    const term = searchQuery.trim().toLocaleLowerCase('pt-BR');
    if (!term) return events;
    return events.filter((event) =>
      [event.title, event.description, event.category]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(term),
    );
  }, [events, searchQuery]);

  const weekOccurrences = useMemo(
    () =>
      weekDays.flatMap((day) =>
        eventsForDate(filteredEvents, dateToKey(day), visibleCategorySet),
      ),
    [filteredEvents, visibleCategorySet, weekDays],
  );

  const selectedEvents = useMemo(
    () => eventsForDate(filteredEvents, selectedDate, visibleCategorySet),
    [filteredEvents, selectedDate, visibleCategorySet],
  );

  const todayEvents = useMemo(
    () => eventsForDate(filteredEvents, todayKey, visibleCategorySet),
    [filteredEvents, todayKey, visibleCategorySet],
  );

  const pendingThisWeek = weekOccurrences.filter(
    (event) => !isOccurrenceCompleted(event, event.occurrenceDate),
  ).length;
  const completedThisWeek = weekOccurrences.length - pendingThisWeek;
  const weekProgress = weekOccurrences.length
    ? Math.round((completedThisWeek / weekOccurrences.length) * 100)
    : 0;
  const pendingToday = todayEvents.filter(
    (event) => !isOccurrenceCompleted(event, event.occurrenceDate),
  ).length;

  const nextOccurrence = useMemo(() => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`;
    for (let offset = 0; offset < 120; offset += 1) {
      const dateKey = dateToKey(addDays(now, offset));
      const candidates = eventsForDate(filteredEvents, dateKey, visibleCategorySet).filter(
        (event) =>
          !isOccurrenceCompleted(event, dateKey) &&
          (offset > 0 || event.endTime >= currentTime),
      );
      if (candidates.length) return candidates[0];
    }
    return null;
  }, [filteredEvents, visibleCategorySet, todayKey]);

  function toggleFilter(category) {
    setActiveCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function resetForm(date = selectedDate, category = CATEGORIES[0]) {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date, category });
    setFormError('');
  }

  function openNewEvent(date = selectedDate, category = CATEGORIES[0]) {
    resetForm(date, category);
    setFormOpen(true);
  }

  function handleFormChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: type === 'checkbox' ? checked : value };
      if (name === 'weekly' && checked && !current.repeatWeekdays.length) {
        next.repeatWeekdays = [keyToDate(current.date || selectedDate).getDay()];
      }
      return next;
    });
    setFormError('');
  }

  function toggleRepeatWeekday(day) {
    setForm((current) => {
      const selected = new Set(current.repeatWeekdays);
      if (selected.has(day)) selected.delete(day);
      else selected.add(day);
      return { ...current, repeatWeekdays: [...selected] };
    });
    setFormError('');
  }

  function handleSubmit(event) {
    event.preventDefault();
    const title = form.title.trim();
    if (!title || !form.date || !form.startTime || !form.endTime) {
      setFormError('Preencha o título, a data e os horários.');
      return;
    }
    if (form.endTime <= form.startTime) {
      setFormError('O horário de término precisa ser depois do início.');
      return;
    }
    if (form.weekly && !form.repeatWeekdays.length) {
      setFormError('Escolha pelo menos um dia da semana para repetir.');
      return;
    }
    if (form.weekly && form.repeatUntil && form.repeatUntil < form.date) {
      setFormError('A data final da repetição precisa ser igual ou posterior à data inicial.');
      return;
    }

    const weekly = Boolean(form.weekly);
    const repeatWeekdays = weekly ? [...new Set(form.repeatWeekdays)].sort() : [];
    const repeatUntil = weekly ? form.repeatUntil : '';
    if (editingId) {
      setEvents((current) =>
        current.map((item) =>
          item.id === editingId
            ? {
                ...item,
                title,
                category: form.category,
                date: form.date,
                startTime: form.startTime,
                endTime: form.endTime,
                description: form.description.trim(),
                weekly,
                repeatWeekdays,
                repeatUntil,
                completed:
                  !weekly && item.weekly
                    ? item.completedDates.includes(form.date)
                    : item.completed,
              }
            : item,
        ),
      );
    } else {
      setEvents((current) => [
        ...current,
        {
          id: makeId(),
          title,
          category: form.category,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          description: form.description.trim(),
          weekly,
          repeatWeekdays,
          repeatUntil,
          completed: false,
          completedDates: [],
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    setSelectedDate(form.date);
    setMonthCursor(startOfMonth(keyToDate(form.date)));
    resetForm(form.date);
    setFormOpen(false);
  }

  function editEvent(event) {
    setEditingId(event.id);
    setForm({
      title: event.title,
      category: event.category,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      description: event.description,
      weekly: event.weekly,
      repeatWeekdays: event.repeatWeekdays || [],
      repeatUntil: event.repeatUntil || '',
    });
    setFormError('');
    setFormOpen(true);
  }

  function deleteEvent(event) {
    const message = event.weekly
      ? `Excluir todas as ocorrências semanais de “${event.title}”?`
      : `Excluir “${event.title}”?`;
    if (window.confirm(message)) {
      setEvents((current) => current.filter((item) => item.id !== event.id));
      if (editingId === event.id) {
        resetForm();
        setFormOpen(false);
      }
    }
  }

  function toggleCompleted(event) {
    setEvents((current) =>
      current.map((item) => {
        if (item.id !== event.id) return item;
        if (!item.weekly) return { ...item, completed: !item.completed };

        const completedDates = new Set(item.completedDates);
        if (completedDates.has(event.occurrenceDate)) {
          completedDates.delete(event.occurrenceDate);
        } else {
          completedDates.add(event.occurrenceDate);
        }
        return { ...item, completedDates: [...completedDates].sort() };
      }),
    );
  }

  function goToToday() {
    const now = new Date();
    setWeekCursor(startOfWeek(now));
    setMonthCursor(startOfMonth(now));
    setSelectedDate(dateToKey(now));
  }

  function selectMonthDay(day) {
    const key = dateToKey(day);
    setSelectedDate(key);
    if (day.getMonth() !== monthCursor.getMonth()) {
      setMonthCursor(startOfMonth(day));
    }
  }

  const weekEnd = weekDays[6];
  const weekLabel = `${formatShortDate(dateToKey(weekDays[0]))} — ${formatShortDate(
    dateToKey(weekEnd),
  )}`;

  return (
    <section className="calendar-page">
      <header className="calendar-header">
        <div className="calendar-header__text">
          <span className="calendar-eyebrow">Organização acadêmica</span>
          <h1>Meu calendário</h1>
          <p>Veja sua semana, organize compromissos e não perca nenhum prazo.</p>
        </div>
        <button type="button" className="calendar-primary-button" onClick={() => openNewEvent()}>
          <span aria-hidden="true">＋</span> Novo compromisso
        </button>
      </header>

      <section className="calendar-overview" aria-label="Resumo da agenda">
        <article className="calendar-overview__card calendar-overview__card--today">
          <div className="calendar-overview__icon" aria-hidden="true">☀️</div>
          <div>
            <span>Hoje</span>
            <strong>{formatLongDate(todayKey)}</strong>
            <small>
              {todayEvents.length
                ? `${todayEvents.length} compromisso${todayEvents.length === 1 ? '' : 's'} · ${pendingToday} pendente${pendingToday === 1 ? '' : 's'}`
                : 'Nenhum compromisso — aproveite para revisar'}
            </small>
          </div>
          <button type="button" onClick={() => openNewEvent(todayKey, 'Atividades')}>
            ＋
          </button>
        </article>

        <article className="calendar-overview__card calendar-overview__card--next">
          <div className="calendar-overview__icon" aria-hidden="true">⏰</div>
          <div>
            <span>Próximo compromisso</span>
            {nextOccurrence ? (
              <>
                <strong>{nextOccurrence.title}</strong>
                <small>
                  {formatShortDate(nextOccurrence.occurrenceDate)} · {nextOccurrence.startTime} ·{' '}
                  {CATEGORY_META[nextOccurrence.category].icon} {nextOccurrence.category}
                </small>
              </>
            ) : (
              <>
                <strong>Agenda livre</strong>
                <small>Nada pendente nos próximos dias</small>
              </>
            )}
          </div>
        </article>

        <article className="calendar-overview__card calendar-overview__card--progress">
          <div className="calendar-overview__icon" aria-hidden="true">🎯</div>
          <div>
            <span>Progresso da semana</span>
            <strong>{weekProgress}% concluído</strong>
            <small>{completedThisWeek} de {weekOccurrences.length} compromissos finalizados</small>
            <div className="calendar-overview__progress" aria-hidden="true">
              <i style={{ width: `${weekProgress}%` }} />
            </div>
          </div>
        </article>

        <article className="calendar-overview__card calendar-overview__card--quick">
          <div>
            <span>Adicionar rápido</span>
            <strong>O que entrou na agenda?</strong>
          </div>
          <div className="calendar-overview__quick-actions">
            {CATEGORIES.slice(0, 4).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => openNewEvent(selectedDate, category)}
                title={`Adicionar ${category.toLocaleLowerCase('pt-BR')}`}
              >
                <span aria-hidden="true">{CATEGORY_META[category].icon}</span>
                {category === 'Horário de aulas' ? 'Aula' : category}
              </button>
            ))}
          </div>
        </article>
      </section>

      <div className="calendar-filters" aria-label="Filtros do calendário">
        <div className="calendar-filters__label">
          <span>Filtrar agenda</span>
          <small>{activeCategories.size} de {CATEGORIES.length} categorias</small>
        </div>
        <label className="calendar-search">
          <span aria-hidden="true">🔎</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar compromisso..."
            aria-label="Buscar compromisso"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} aria-label="Limpar busca">
              ×
            </button>
          )}
        </label>
        <div className="calendar-filters__options">
          {CATEGORIES.map((category) => {
            const active = activeCategories.has(category);
            const meta = CATEGORY_META[category];
            return (
              <button
                key={category}
                type="button"
                className={[
                  'calendar-filter',
                  `calendar-filter--${meta.slug}`,
                  active ? 'calendar-filter--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => toggleFilter(category)}
                aria-pressed={active}
              >
                <span aria-hidden="true">{meta.icon}</span>
                {category}
              </button>
            );
          })}
          <button
            type="button"
            className="calendar-filter-reset"
            onClick={() =>
              setActiveCategories(
                activeCategories.size === CATEGORIES.length ? new Set() : new Set(CATEGORIES),
              )
            }
          >
            {activeCategories.size === CATEGORIES.length ? 'Ocultar todas' : 'Mostrar todas'}
          </button>
        </div>
      </div>

      <section className="calendar-week">
        <div className="calendar-section-header">
          <div>
            <span className="calendar-section-kicker">Visão semanal</span>
            <h2>Sua semana</h2>
          </div>
          <div className="calendar-week__summary">
            <span>{weekOccurrences.length} compromissos</span>
            <strong>{pendingThisWeek} pendentes</strong>
          </div>
          <div className="calendar-navigation">
            <button
              type="button"
              onClick={() => setWeekCursor((current) => addDays(current, -7))}
              aria-label="Semana anterior"
            >
              ‹
            </button>
            <button type="button" className="calendar-navigation__today" onClick={goToToday}>
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setWeekCursor((current) => addDays(current, 7))}
              aria-label="Próxima semana"
            >
              ›
            </button>
          </div>
        </div>

        <div className="calendar-week__range">{weekLabel}</div>
        <div className="calendar-week__grid">
          {weekDays.map((day) => {
            const key = dateToKey(day);
            const dayEvents = eventsForDate(filteredEvents, key, visibleCategorySet);
            return (
              <div
                key={key}
                className={[
                  'calendar-week-day',
                  key === todayKey ? 'calendar-week-day--today' : '',
                  key === selectedDate ? 'calendar-week-day--selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <button
                  type="button"
                  className="calendar-week-day__heading"
                  onClick={() => {
                    setSelectedDate(key);
                    setMonthCursor(startOfMonth(day));
                  }}
                >
                  <span>{WEEKDAYS[(day.getDay() + 6) % 7]}</span>
                  <strong>{day.getDate()}</strong>
                </button>
                <div className="calendar-week-day__events">
                  {dayEvents.length === 0 ? (
                    <button
                      type="button"
                      className="calendar-week-day__empty"
                      onClick={() => openNewEvent(key)}
                    >
                      <span>＋</span> Adicionar
                    </button>
                  ) : (
                    dayEvents.map((event) => (
                      <CalendarEventCard
                        key={`${event.id}-${key}`}
                        event={event}
                        compact
                        onToggle={toggleCompleted}
                        onEdit={editEvent}
                        onDelete={deleteEvent}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="calendar-workspace">
        <section className="calendar-month">
          <div className="calendar-section-header">
            <div>
              <span className="calendar-section-kicker">Visão mensal</span>
              <h2>{formatMonth(monthCursor)}</h2>
            </div>
            <div className="calendar-navigation">
              <button
                type="button"
                onClick={() => setMonthCursor((current) => shiftMonth(current, -1))}
                aria-label="Mês anterior"
              >
                ‹
              </button>
              <button type="button" className="calendar-navigation__today" onClick={goToToday}>
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setMonthCursor((current) => shiftMonth(current, 1))}
                aria-label="Próximo mês"
              >
                ›
              </button>
            </div>
          </div>

          <div className="calendar-month__weekdays" aria-hidden="true">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>

          <div className="calendar-month__grid">
            {monthDays.map((day) => {
              const key = dateToKey(day);
              const dayEvents = eventsForDate(filteredEvents, key, visibleCategorySet);
              const outside = day.getMonth() !== monthCursor.getMonth();
              const selected = key === selectedDate;
              return (
                <button
                  type="button"
                  key={key}
                  className={[
                    'calendar-month-day',
                    outside ? 'calendar-month-day--outside' : '',
                    selected ? 'calendar-month-day--selected' : '',
                    key === todayKey ? 'calendar-month-day--today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => selectMonthDay(day)}
                  aria-label={`${formatLongDate(key)}, ${dayEvents.length} compromissos`}
                >
                  <span className="calendar-month-day__number">{day.getDate()}</span>
                  <span className="calendar-month-day__items">
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        key={`${event.id}-${key}`}
                        className={[
                          'calendar-month-day__item',
                          `calendar-month-day__item--${CATEGORY_META[event.category].slug}`,
                          isOccurrenceCompleted(event, key)
                            ? 'calendar-month-day__item--completed'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <span>{event.startTime}</span> {event.title}
                      </span>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="calendar-month-day__more">+{dayEvents.length - 3}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="calendar-day-panel">
          <div className="calendar-day-panel__header">
            <div>
              <span className="calendar-section-kicker">Agenda do dia</span>
              <h2>{formatLongDate(selectedDate)}</h2>
            </div>
            <button
              type="button"
              className="calendar-day-panel__add"
              onClick={() => openNewEvent(selectedDate)}
              aria-label="Adicionar compromisso neste dia"
            >
              ＋
            </button>
          </div>

          <div className="calendar-day-panel__events">
            {selectedEvents.length === 0 ? (
              <div className="calendar-empty-state">
                <span aria-hidden="true">◷</span>
                <strong>Dia livre por enquanto</strong>
                <p>Adicione uma aula, prova ou tarefa para este dia.</p>
                <button type="button" onClick={() => openNewEvent(selectedDate)}>
                  Adicionar compromisso
                </button>
              </div>
            ) : (
              selectedEvents.map((event) => (
                <CalendarEventCard
                  key={`${event.id}-${selectedDate}`}
                  event={event}
                  onToggle={toggleCompleted}
                  onEdit={editEvent}
                  onDelete={deleteEvent}
                />
              ))
            )}
          </div>
        </aside>
      </div>

      {formOpen && (
        <div className="calendar-modal" role="presentation" onMouseDown={() => setFormOpen(false)}>
          <div
            className="calendar-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-form-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="calendar-modal__header">
              <div>
                <span className="calendar-section-kicker">
                  {editingId ? 'Atualizar agenda' : 'Organizar agenda'}
                </span>
                <h2 id="calendar-form-title">
                  {editingId ? 'Editar compromisso' : 'Novo compromisso'}
                </h2>
              </div>
              <button
                type="button"
                className="calendar-modal__close"
                onClick={() => setFormOpen(false)}
                aria-label="Fechar formulário"
              >
                ×
              </button>
            </div>

            <form className="calendar-form" onSubmit={handleSubmit}>
              <label className="calendar-form__field calendar-form__field--full">
                <span>Título</span>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="Ex.: Prova de Cardiologia"
                  autoFocus
                  required
                />
              </label>

              <label className="calendar-form__field calendar-form__field--full">
                <span>Categoria</span>
                <select name="category" value={form.category} onChange={handleFormChange}>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="calendar-form__field calendar-form__field--full">
                <span>Data</span>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleFormChange}
                  required
                />
              </label>

              <label className="calendar-form__field">
                <span>Início</span>
                <input
                  type="time"
                  name="startTime"
                  value={form.startTime}
                  onChange={handleFormChange}
                  required
                />
              </label>

              <label className="calendar-form__field">
                <span>Término</span>
                <input
                  type="time"
                  name="endTime"
                  value={form.endTime}
                  onChange={handleFormChange}
                  required
                />
              </label>

              <label className="calendar-form__field calendar-form__field--full">
                <span>Descrição <small>(opcional)</small></span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Anote sala, conteúdo, materiais ou observações..."
                  rows="3"
                />
              </label>

              <label className="calendar-form__repeat calendar-form__field--full">
                <input
                  type="checkbox"
                  name="weekly"
                  checked={form.weekly}
                  onChange={handleFormChange}
                />
                <span className="calendar-form__repeat-box">✓</span>
                <span>
                  <strong>Repetir por semana</strong>
                  <small>Escolha um ou vários dias e, se quiser, uma data final.</small>
                </span>
              </label>

              {form.weekly && (
                <div className="calendar-repeat-settings calendar-form__field--full">
                  <div className="calendar-repeat-weekdays">
                    <span>Repetir todas as:</span>
                    <div>
                      {WEEKDAY_OPTIONS.map((weekday) => {
                        const selected = form.repeatWeekdays.includes(weekday.value);
                        return (
                          <button
                            key={weekday.value}
                            type="button"
                            className={selected ? 'selected' : ''}
                            onClick={() => toggleRepeatWeekday(weekday.value)}
                            aria-pressed={selected}
                          >
                            {weekday.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <label className="calendar-repeat-until">
                    <span>Repetir até <small>(opcional)</small></span>
                    <input
                      type="date"
                      name="repeatUntil"
                      min={form.date}
                      value={form.repeatUntil}
                      onChange={handleFormChange}
                    />
                  </label>
                </div>
              )}

              {formError && (
                <p className="calendar-form__error calendar-form__field--full" role="alert">
                  {formError}
                </p>
              )}

              <div className="calendar-form__actions calendar-form__field--full">
                <button
                  type="button"
                  className="calendar-secondary-button"
                  onClick={() => {
                    setFormOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="calendar-primary-button">
                  {editingId ? 'Salvar alterações' : 'Adicionar à agenda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
