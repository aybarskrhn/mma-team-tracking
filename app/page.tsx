'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type Task, type TaskStatus, type Member, type Event, type Update } from '@/lib/supabase'

/* ─── DESIGN TOKENS ─────────────────────────────────────────────────────── */
// McKinsey-inspired: editorial, refined, black/white/blue
// Fonts: Playfair Display (headers) + IBM Plex Sans (body)

const MEMBERS: Member[] = ['Aybars', 'Maga', 'Moritz']

const MEMBER_COLORS: Record<Member, string> = {
  Aybars: '#0065BD',
  Maga: '#111111',
  Moritz: '#888888',
}

const MEMBER_ACCENT: Record<Member, string> = {
  Aybars: '#0065BD',
  Maga: '#444444',
  Moritz: '#999999',
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; border: string }> = {
  todo:       { label: 'To Do',       color: '#666',    bg: '#f5f5f5',   border: '#ddd' },
  inprogress: { label: 'In Progress', color: '#0065BD', bg: '#EBF3FC',   border: '#0065BD' },
  done:       { label: 'Done',        color: '#1a7a3c', bg: '#EBF7F0',   border: '#1a7a3c' },
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  team_meeting:  { label: 'Team Meeting',  color: '#0065BD' },
  milestone:     { label: 'Milestone',     color: '#7c3aed' },
  prototype_day: { label: 'Prototype Day', color: '#b45309' },
  deadline:      { label: 'Deadline',      color: '#b91c1c' },
  other:         { label: 'Other',         color: '#555555' },
}

function getDaysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(dateStr); target.setHours(0,0,0,0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatRelative(dateStr: string): string {
  const d = getDaysUntil(dateStr)
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  if (d === -1) return 'Yesterday'
  if (d < 0) return `${Math.abs(d)}d ago`
  return `in ${d}d`
}

/* ─── GLOBAL STYLES ─────────────────────────────────────────────────────── */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --black: #0a0a0a;
      --ink:   #111111;
      --mid:   #444444;
      --muted: #888888;
      --line:  #e2e2e2;
      --bg:    #F7F6F3;
      --white: #ffffff;
      --blue:  #0065BD;
      --blue-lt: #EBF3FC;
      --blue-dk: #004A8C;
      --serif: 'Playfair Display', Georgia, serif;
      --sans:  'IBM Plex Sans', system-ui, sans-serif;
      --mono:  'IBM Plex Mono', monospace;
    }

    body { background: var(--bg); color: var(--ink); font-family: var(--sans); }

    input, textarea, select {
      font-family: var(--sans);
      font-size: 14px;
      color: var(--ink);
      background: var(--white);
      border: 1px solid var(--line);
      border-radius: 2px;
      padding: 10px 12px;
      width: 100%;
      outline: none;
      transition: border-color 0.15s;
    }
    input:focus, textarea:focus, select:focus { border-color: var(--blue); }
    textarea { resize: vertical; }

    .fade-in { animation: fadeUp 0.25s ease both; }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .tab-btn {
      font-family: var(--sans);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 10px 20px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--muted);
      cursor: pointer;
      transition: color 0.15s, border-color 0.15s;
    }
    .tab-btn.active { color: var(--blue); border-bottom-color: var(--blue); }
    .tab-btn:hover:not(.active) { color: var(--ink); }

    .btn-primary {
      font-family: var(--sans);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      background: var(--blue);
      color: #fff;
      border: none;
      padding: 10px 20px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-primary:hover { background: var(--blue-dk); }
    .btn-primary:disabled { background: #ccc; cursor: default; }

    .btn-ghost {
      font-family: var(--sans);
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.04em;
      background: none;
      color: var(--muted);
      border: 1px solid var(--line);
      padding: 10px 20px;
      cursor: pointer;
      transition: color 0.15s, border-color 0.15s;
    }
    .btn-ghost:hover { color: var(--ink); border-color: var(--mid); }

    .divider { height: 1px; background: var(--line); }

    .stat-card {
      background: var(--white);
      border: 1px solid var(--line);
      padding: 20px 24px;
    }

    .card {
      background: var(--white);
      border: 1px solid var(--line);
    }

    /* Blog editor toolbar */
    .blog-toolbar button {
      font-family: var(--mono);
      font-size: 13px;
      background: none;
      border: 1px solid var(--line);
      padding: 4px 10px;
      cursor: pointer;
      color: var(--mid);
      transition: all 0.1s;
    }
    .blog-toolbar button:hover { background: var(--ink); color: #fff; border-color: var(--ink); }
    .blog-toolbar button.active-fmt { background: var(--ink); color: #fff; border-color: var(--ink); }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
  `}</style>
)

/* ─── MINI CALENDAR ─────────────────────────────────────────────────────── */
function MiniCalendar({ events }: { events: Event[] }) {
  const [current, setCurrent] = useState(new Date())
  const year = current.getFullYear()
  const month = current.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const eventDates = new Set(
    events
      .filter(e => {
        const d = new Date(e.date)
        return d.getFullYear() === year && d.getMonth() === month
      })
      .map(e => new Date(e.date).getDate())
  )

  const cells: (number | null)[] = []
  const startOffset = firstDay === 0 ? 6 : firstDay - 1
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button
          onClick={() => setCurrent(new Date(year, month - 1))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18, lineHeight: 1, padding: '0 4px' }}
        >‹</button>
        <span style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 14 }}>
          {current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={() => setCurrent(new Date(year, month + 1))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18, lineHeight: 1, padding: '0 4px' }}
        >›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
        {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.05em', padding: '2px 0', textTransform: 'uppercase' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
          const hasEvent = eventDates.has(day)
          return (
            <div key={i} style={{
              textAlign: 'center', fontSize: 12, padding: '5px 0', position: 'relative',
              background: isToday ? 'var(--blue)' : 'transparent',
              color: isToday ? '#fff' : 'var(--ink)',
              fontWeight: isToday ? 600 : 400,
            }}>
              {day}
              {hasEvent && !isToday && (
                <div style={{ position: 'absolute', bottom: 1, left: '50%', transform: 'translateX(-50%)', width: 3, height: 3, borderRadius: '50%', background: 'var(--blue)' }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── TASK CARD ─────────────────────────────────────────────────────────── */
function TaskCard({ task, onStatusChange, onDelete }: {
  task: Task
  onStatusChange: (id: string, status: TaskStatus) => void
  onDelete: (id: string) => void
}) {
  const statuses: TaskStatus[] = ['todo', 'inprogress', 'done']
  const cfg = STATUS_CONFIG[task.status]
  const memberColor = MEMBER_COLORS[task.assignee]
  const isOverdue = task.deadline && getDaysUntil(task.deadline) < 0 && task.status !== 'done'

  return (
    <div className="fade-in" style={{
      background: 'var(--white)',
      border: '1px solid var(--line)',
      borderLeft: `3px solid ${memberColor}`,
      padding: '14px 16px',
      marginBottom: 8,
      opacity: task.status === 'done' ? 0.6 : 1,
      transition: 'opacity 0.2s, box-shadow 0.15s',
    }}
    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)')}
    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <span style={{
          fontSize: 13, fontWeight: 500, color: task.status === 'done' ? 'var(--muted)' : 'var(--ink)',
          textDecoration: task.status === 'done' ? 'line-through' : 'none',
          lineHeight: 1.4, flex: 1,
        }}>{task.title}</span>
        <button
          onClick={() => onDelete(task.id)}
          style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#b91c1c')}
          onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
        >×</button>
      </div>
      {task.description && (
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.5 }}>{task.description}</p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
          color: memberColor, background: `${memberColor}14`,
          padding: '3px 8px',
        }}>{task.assignee}</span>
        <select
          value={task.status}
          onChange={e => onStatusChange(task.id, e.target.value as TaskStatus)}
          style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
            color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
            borderRadius: 0, padding: '3px 8px', width: 'auto', cursor: 'pointer'
          }}
        >
          {statuses.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
        </select>
        {task.deadline && (
          <span style={{ fontSize: 11, color: isOverdue ? '#b91c1c' : 'var(--muted)', marginLeft: 'auto', fontFamily: 'var(--mono)' }}>
            {isOverdue ? '⚠ ' : ''}{formatRelative(task.deadline)}
          </span>
        )}
      </div>
    </div>
  )
}

/* ─── MODAL BASE ─────────────────────────────────────────────────────────── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.6)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16
    }}>
      <div className="fade-in" style={{
        background: 'var(--white)', border: '1px solid var(--line)', width: '100%', maxWidth: 480,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

/* ─── ADD TASK MODAL ─────────────────────────────────────────────────────── */
function AddTaskModal({ onAdd, onClose }: {
  onAdd: (t: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [assignee, setAssignee] = useState<Member>('Aybars')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [deadline, setDeadline] = useState('')

  const submit = () => {
    if (!title.trim()) return
    onAdd({ title: title.trim(), description: desc.trim() || undefined, assignee, status, deadline: deadline || undefined })
    onClose()
  }

  return (
    <Modal title="New Task" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Title *</label>
          <input placeholder="What needs to be done?" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Description</label>
          <textarea placeholder="Optional details..." value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Assignee</label>
            <select value={assignee} onChange={e => setAssignee(e.target.value as Member)}>
              {MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Deadline</label>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={!title.trim()} style={{ flex: 2 }}>Add Task</button>
        </div>
      </div>
    </Modal>
  )
}

/* ─── ADD EVENT MODAL ────────────────────────────────────────────────────── */
function AddEventModal({ onAdd, onClose }: {
  onAdd: (e: Omit<Event, 'id' | 'created_at'>) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState<Event['type']>('team_meeting')
  const [desc, setDesc] = useState('')

  const submit = () => {
    if (!title.trim() || !date) return
    onAdd({
      title: title.trim(),
      date,
      time: time || undefined,
      location: location.trim() || undefined,
      type,
      description: desc.trim() || undefined
    })
    onClose()
  }

  const canSubmit = title.trim() && date

  return (
    <Modal title="New Event" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Event Title *</label>
          <input placeholder="e.g. Weekly Sync with TUM Venture Labs" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Type</label>
          <select value={type} onChange={e => setType(e.target.value as Event['type'])}>
            {Object.entries(EVENT_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>📍 Location</label>
          <input placeholder="e.g. TUM Main Campus, Room 01.07 / Zoom" value={location} onChange={e => setLocation(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Notes</label>
          <textarea placeholder="Agenda, context, links..." value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={!canSubmit} style={{ flex: 2 }}>Add Event</button>
        </div>
      </div>
    </Modal>
  )
}

/* ─── BLOG SECTION ───────────────────────────────────────────────────────── */
interface BlogPost {
  id: string
  title: string
  content: string
  author: Member
  created_at: string
  updated_at: string
  tags: string[]
}

function BlogEditor({ onSave, onCancel, initial }: {
  onSave: (p: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>) => void
  onCancel: () => void
  initial?: BlogPost
}) {
  const [title, setTitle] = useState(initial?.title || '')
  const [content, setContent] = useState(initial?.content || '')
  const [author, setAuthor] = useState<Member>(initial?.author || 'Aybars')
  const [tagInput, setTagInput] = useState(initial?.tags.join(', ') || '')
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [wordCount, setWordCount] = useState(0)

  useEffect(() => {
    setWordCount(content.trim() ? content.trim().split(/\s+/).length : 0)
  }, [content])

  const insertFormat = (before: string, after = '') => {
    const ta = textRef.current
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const selected = content.slice(start, end)
    const newContent = content.slice(0, start) + before + selected + after + content.slice(end)
    setContent(newContent)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + before.length, end + before.length)
    }, 0)
  }

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
    onSave({ title: title.trim(), content: content.trim(), author, tags })
  }

  return (
    <div className="card fade-in" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', background: '#fafafa' }}>
        <input
          placeholder="Post title..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{
            fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700,
            border: 'none', borderBottom: '2px solid var(--line)',
            borderRadius: 0, background: 'transparent', padding: '6px 0', color: 'var(--ink)',
            letterSpacing: '-0.01em'
          }}
        />
      </div>

      {/* Toolbar */}
      <div className="blog-toolbar" style={{ display: 'flex', gap: 4, padding: '10px 20px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
        {[
          { label: 'B', action: () => insertFormat('**', '**'), title: 'Bold' },
          { label: 'I', action: () => insertFormat('_', '_'), title: 'Italic' },
          { label: 'H2', action: () => insertFormat('## '), title: 'Heading' },
          { label: '—', action: () => insertFormat('\n---\n'), title: 'Divider' },
          { label: '•', action: () => insertFormat('\n- '), title: 'List item' },
          { label: '1.', action: () => insertFormat('\n1. '), title: 'Numbered list' },
          { label: '❝', action: () => insertFormat('\n> '), title: 'Blockquote' },
          { label: '`', action: () => insertFormat('`', '`'), title: 'Inline code' },
        ].map(({ label, action, title: t }) => (
          <button key={label} onClick={action} title={t}>{label}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', alignSelf: 'center', fontFamily: 'var(--mono)' }}>
          {wordCount} words
        </span>
      </div>

      <textarea
        ref={textRef}
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={`Write your startup update here...\n\nShare what the team has been working on, key insights, decisions made, next steps. Be specific — this is your team's living journal.`}
        rows={14}
        style={{
          border: 'none', borderRadius: 0, padding: '20px',
          fontSize: 14, lineHeight: 1.8, fontFamily: 'var(--sans)', color: 'var(--ink)',
          width: '100%', background: 'var(--white)',
        }}
      />

      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <select value={author} onChange={e => setAuthor(e.target.value as Member)} style={{ width: 'auto', flex: 'none' }}>
          {MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input
          placeholder="Tags: e.g. product, market, tech"
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          style={{ flex: 1, minWidth: 180 }}
        />
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn-ghost" onClick={onCancel}>Discard</button>
          <button className="btn-primary" onClick={handleSave} disabled={!title.trim() || !content.trim()}>
            {initial ? 'Save Changes' : 'Publish Post'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BlogPostCard({ post, onEdit, onDelete }: { post: BlogPost; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const preview = post.content.slice(0, 300)
  const hasMore = post.content.length > 300
  const memberColor = MEMBER_COLORS[post.author as Member] || 'var(--muted)'

  return (
    <div className="card fade-in" style={{ marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderLeft: `4px solid ${memberColor}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3, flex: 1, marginRight: 16 }}>
            {post.title}
          </h3>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={onEdit} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--blue)', cursor: 'pointer', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', padding: 0 }}>Edit</button>
            <button onClick={onDelete} style={{ background: 'none', border: 'none', fontSize: 11, color: '#ccc', cursor: 'pointer', padding: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#b91c1c')}
              onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
            >Delete</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 20, height: 20, background: memberColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>{post.author[0]}</div>
            <span style={{ fontSize: 12, fontWeight: 600, color: memberColor }}>{post.author}</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
            {new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          {post.updated_at !== post.created_at && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>(edited)</span>
          )}
          {post.tags.map(tag => (
            <span key={tag} style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--blue)', background: 'var(--blue-lt)', padding: '2px 7px' }}>{tag}</span>
          ))}
        </div>

        <div style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
          {expanded ? post.content : preview}
          {!expanded && hasMore && '...'}
        </div>

        {hasMore && (
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', padding: 0 }}
          >
            {expanded ? 'Collapse ↑' : 'Read more ↓'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── MAIN PAGE ──────────────────────────────────────────────────────────── */
export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [updates, setUpdates] = useState<Update[]>([])
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [activeTab, setActiveTab] = useState<'board' | 'timeline' | 'updates' | 'blog'>('board')
  const [filterMember, setFilterMember] = useState<Member | 'all'>('all')
  const [showAddTask, setShowAddTask] = useState(false)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [newUpdate, setNewUpdate] = useState('')
  const [updateAuthor, setUpdateAuthor] = useState<Member>('Aybars')
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(true)
  const [showBlogEditor, setShowBlogEditor] = useState(false)
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [{ data: t }, { data: e }, { data: u }] = await Promise.all([
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('events').select('*').order('date', { ascending: true }),
        supabase.from('updates').select('*').order('created_at', { ascending: false }),
      ])
      setTasks(t || [])
      setEvents(e || [])
      setUpdates(u || [])
      setIsConnected(true)
    } catch {
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load blog posts from localStorage (local persistence)
  useEffect(() => {
    loadData()
    try {
      const saved = localStorage.getItem('mma_blog_posts')
      if (saved) setBlogPosts(JSON.parse(saved))
    } catch {}
  }, [loadData])

  const saveBlogPosts = (posts: BlogPost[]) => {
    setBlogPosts(posts)
    localStorage.setItem('mma_blog_posts', JSON.stringify(posts))
  }

  const addBlogPost = (data: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString()
    const post: BlogPost = { ...data, id: crypto.randomUUID(), created_at: now, updated_at: now }
    saveBlogPosts([post, ...blogPosts])
    setShowBlogEditor(false)
  }

  const updateBlogPost = (id: string, data: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>) => {
    saveBlogPosts(blogPosts.map(p => p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p))
    setEditingPost(null)
  }

  const deleteBlogPost = (id: string) => {
    saveBlogPosts(blogPosts.filter(p => p.id !== id))
  }

  const addTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    const { data } = await supabase.from('tasks').insert([{ ...taskData, updated_at: new Date().toISOString() }]).select().single()
    if (data) setTasks(prev => [data, ...prev])
  }

  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    await supabase.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status, updated_at: new Date().toISOString() } : t))
  }

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const addEvent = async (eventData: Omit<Event, 'id' | 'created_at'>) => {
    const { data } = await supabase.from('events').insert([eventData]).select().single()
    if (data) setEvents(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)))
  }

  const deleteEvent = async (id: string) => {
    await supabase.from('events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const postUpdate = async () => {
    if (!newUpdate.trim()) return
    const { data } = await supabase.from('updates').insert([{ author: updateAuthor, content: newUpdate.trim() }]).select().single()
    if (data) setUpdates(prev => [data, ...prev])
    setNewUpdate('')
  }

  const filteredTasks = filterMember === 'all' ? tasks : tasks.filter(t => t.assignee === filterMember)
  const upcomingEvents = events.filter(e => getDaysUntil(e.date) >= -1).slice(0, 8)

  const stats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    inprogress: tasks.filter(t => t.status === 'inprogress').length,
    overdue: tasks.filter(t => t.deadline && getDaysUntil(t.deadline) < 0 && t.status !== 'done').length,
  }

  const memberStats = MEMBERS.map(m => ({
    name: m,
    total: tasks.filter(t => t.assignee === m).length,
    done: tasks.filter(t => t.assignee === m && t.status === 'done').length,
    color: MEMBER_COLORS[m],
    accent: MEMBER_ACCENT[m],
  }))

  if (loading) return (
    <>
      <GlobalStyle />
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 52, fontWeight: 900, color: 'var(--blue)', letterSpacing: '-0.02em' }}>MMA</div>
          <div style={{ color: 'var(--muted)', marginTop: 8, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading workspace...</div>
        </div>
      </div>
    </>
  )

  return (
    <>
      <GlobalStyle />
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <header style={{ background: 'var(--white)', borderBottom: '1px solid var(--line)' }}>
          {/* Top bar */}
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ fontFamily: 'var(--serif)', fontWeight: 900, fontSize: 26, color: 'var(--blue)', letterSpacing: '-0.02em' }}>MMA</div>
                <div style={{ width: 1, height: 24, background: 'var(--line)' }} />
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>TUM Venture Labs · Student Tech Track</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {!isConnected && (
                  <div style={{ fontSize: 11, color: '#b91c1c', background: '#FEF2F2', border: '1px solid #FECACA', padding: '4px 10px', letterSpacing: '0.04em' }}>
                    ⚠ Supabase offline
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  {MEMBERS.map(m => (
                    <div key={m} title={m} style={{
                      width: 30, height: 30, background: MEMBER_COLORS[m],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.02em',
                    }}>{m[0]}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Nav tabs */}
            <div style={{ display: 'flex', gap: 0, borderTop: '1px solid var(--line)' }}>
              {([
                ['board',    'Kanban Board'],
                ['timeline', 'Timeline'],
                ['updates',  'Team Updates'],
                ['blog',     'Startup Journal'],
              ] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >{label}</button>
              ))}
            </div>
          </div>
        </header>

        {/* ── BODY ───────────────────────────────────────────────────────── */}
        <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 32px 60px' }}>

          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, marginBottom: 1 }}>
            {[
              { label: 'Total Tasks',  value: stats.total,      color: 'var(--ink)' },
              { label: 'In Progress',  value: stats.inprogress,  color: 'var(--blue)' },
              { label: 'Completed',    value: stats.done,        color: '#1a7a3c' },
              { label: 'Overdue',      value: stats.overdue,     color: stats.overdue > 0 ? '#b91c1c' : 'var(--muted)' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 40, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Member Progress */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, marginBottom: 28 }}>
            {memberStats.map(m => {
              const pct = m.total > 0 ? Math.round((m.done / m.total) * 100) : 0
              return (
                <div key={m.name} className="stat-card" style={{ borderTop: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{m.name[0]}</div>
                      <span style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{m.name}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 500, color: m.color }}>{pct}%</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--line)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: m.color, transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, fontFamily: 'var(--mono)' }}>{m.done}/{m.total} tasks done</div>
                </div>
              )
            })}
          </div>

          {/* Main Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 288px', gap: 24 }}>

            {/* LEFT CONTENT */}
            <div>

              {/* ── KANBAN BOARD ───────────────────────────────────────── */}
              {activeTab === 'board' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => setFilterMember('all')}
                        style={{
                          padding: '4px 14px', border: '1px solid', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
                          borderColor: filterMember === 'all' ? 'var(--blue)' : 'var(--line)',
                          background: filterMember === 'all' ? 'var(--blue)' : 'transparent',
                          color: filterMember === 'all' ? '#fff' : 'var(--muted)',
                        }}
                      >All</button>
                      {MEMBERS.map(m => (
                        <button key={m} onClick={() => setFilterMember(m)} style={{
                          padding: '4px 14px', border: '1px solid', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
                          borderColor: filterMember === m ? MEMBER_COLORS[m] : 'var(--line)',
                          background: filterMember === m ? MEMBER_COLORS[m] : 'transparent',
                          color: filterMember === m ? '#fff' : 'var(--muted)',
                        }}>{m}</button>
                      ))}
                    </div>
                    <button className="btn-primary" onClick={() => setShowAddTask(true)}>+ New Task</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {(['todo', 'inprogress', 'done'] as TaskStatus[]).map(status => {
                      const cfg = STATUS_CONFIG[status]
                      const col = filteredTasks.filter(t => t.status === status)
                      return (
                        <div key={status} style={{ background: 'var(--white)', border: '1px solid var(--line)', borderTop: `3px solid ${cfg.color}` }}>
                          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: cfg.color }}>{cfg.label}</span>
                            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{col.length}</span>
                          </div>
                          <div style={{ padding: 10, minHeight: 60 }}>
                            {col.length === 0 ? (
                              <div style={{ textAlign: 'center', color: '#ccc', fontSize: 12, padding: '20px 0' }}>—</div>
                            ) : col.map(task => (
                              <TaskCard key={task.id} task={task} onStatusChange={updateTaskStatus} onDelete={deleteTask} />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── TIMELINE ───────────────────────────────────────────── */}
              {activeTab === 'timeline' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <button className="btn-primary" onClick={() => setShowAddEvent(true)}>+ New Event</button>
                  </div>

                  {events.length === 0 ? (
                    <div className="card" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      No events scheduled yet — add your first one
                    </div>
                  ) : (
                    <div style={{ position: 'relative', paddingLeft: 28 }}>
                      <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 1, background: 'var(--line)' }} />
                      {events.map(event => {
                        const cfg = EVENT_TYPE_CONFIG[event.type]
                        const d = getDaysUntil(event.date)
                        const isPast = d < 0
                        return (
                          <div key={event.id} className="fade-in" style={{ position: 'relative', marginBottom: 14, opacity: isPast ? 0.55 : 1 }}>
                            <div style={{ position: 'absolute', left: -22, top: 16, width: 10, height: 10, background: cfg.color, border: '2px solid var(--bg)', borderRadius: '50%' }} />
                            <div className="card" style={{ borderLeft: `3px solid ${cfg.color}`, overflow: 'hidden' }}>
                              <div style={{ padding: '14px 18px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: cfg.color, background: `${cfg.color}14`, padding: '2px 8px' }}>{cfg.label}</span>
                                      {!isPast && d <= 3 && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#b91c1c', textTransform: 'uppercase' }}>Soon</span>}
                                    </div>
                                    <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{event.title}</div>
                                    {event.description && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{event.description}</div>}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', flexWrap: 'wrap' }}>
                                      <span>📅 {formatDate(event.date)}{event.time ? ` · ${event.time}` : ''}</span>
                                      {(event as any).location && <span>📍 {(event as any).location}</span>}
                                      <span style={{ color: isPast ? 'var(--muted)' : 'var(--blue)', fontWeight: 500 }}>{formatRelative(event.date)}</span>
                                    </div>
                                  </div>
                                  <button onClick={() => deleteEvent(event.id)}
                                    style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 16, padding: '0 2px', marginLeft: 12 }}
                                    onMouseEnter={e => (e.currentTarget.style.color = '#b91c1c')}
                                    onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
                                  >×</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── TEAM UPDATES ───────────────────────────────────────── */}
              {activeTab === 'updates' && (
                <div>
                  <div className="card" style={{ marginBottom: 16, padding: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>Post Update</div>
                    <textarea
                      placeholder="What are you working on? Share a progress update, blocker, or win..."
                      value={newUpdate}
                      onChange={e => setNewUpdate(e.target.value)}
                      rows={3}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postUpdate() }}
                      style={{ marginBottom: 10 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <select value={updateAuthor} onChange={e => setUpdateAuthor(e.target.value as Member)} style={{ width: 'auto', flex: 1 }}>
                        {MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <button className="btn-primary" onClick={postUpdate} disabled={!newUpdate.trim()}>Post</button>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8, fontFamily: 'var(--mono)', letterSpacing: '0.04em' }}>⌘ + Enter to post</div>
                  </div>

                  {updates.length === 0 ? (
                    <div className="card" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No updates yet</div>
                  ) : updates.map(u => (
                    <div key={u.id} className="card fade-in" style={{ marginBottom: 10, borderLeft: `3px solid ${MEMBER_COLORS[u.author as Member] || 'var(--muted)'}`, padding: '16px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 24, height: 24, background: MEMBER_COLORS[u.author as Member] || '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{u.author[0]}</div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{u.author}</span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                          {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {new Date(u.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.7 }}>{u.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* ── STARTUP JOURNAL / BLOG ─────────────────────────────── */}
              {activeTab === 'blog' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 4 }}>Startup Journal</h2>
                      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>Document your startup's journey — ideas, learnings, pivots, decisions.</p>
                    </div>
                    {!showBlogEditor && !editingPost && (
                      <button className="btn-primary" onClick={() => setShowBlogEditor(true)}>+ New Post</button>
                    )}
                  </div>

                  {showBlogEditor && (
                    <div style={{ marginBottom: 20 }}>
                      <BlogEditor onSave={addBlogPost} onCancel={() => setShowBlogEditor(false)} />
                    </div>
                  )}

                  {blogPosts.length === 0 && !showBlogEditor ? (
                    <div className="card" style={{ padding: '60px 0', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--muted)', marginBottom: 8 }}>Your journal is empty</div>
                      <div style={{ fontSize: 13, color: '#bbb', marginBottom: 20 }}>Start documenting your startup journey</div>
                      <button className="btn-primary" onClick={() => setShowBlogEditor(true)}>Write First Post</button>
                    </div>
                  ) : blogPosts.map(post => {
                    if (editingPost?.id === post.id) {
                      return (
                        <div key={post.id} style={{ marginBottom: 16 }}>
                          <BlogEditor
                            initial={post}
                            onSave={data => updateBlogPost(post.id, data)}
                            onCancel={() => setEditingPost(null)}
                          />
                        </div>
                      )
                    }
                    return (
                      <BlogPostCard
                        key={post.id}
                        post={post}
                        onEdit={() => { setEditingPost(post); setShowBlogEditor(false) }}
                        onDelete={() => deleteBlogPost(post.id)}
                      />
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── RIGHT SIDEBAR ─────────────────────────────────────────── */}
            <div>
              {/* Calendar */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Calendar</span>
                </div>
                <MiniCalendar events={events} />
              </div>

              {/* Upcoming Events */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Upcoming</span>
                </div>
                <div style={{ padding: '12px 0' }}>
                  {upcomingEvents.length === 0 ? (
                    <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>No upcoming events</div>
                  ) : upcomingEvents.map(event => {
                    const cfg = EVENT_TYPE_CONFIG[event.type]
                    const d = getDaysUntil(event.date)
                    return (
                      <div key={event.id} style={{ display: 'flex', gap: 12, padding: '8px 20px', borderBottom: '1px solid var(--line)' }}>
                        <div style={{ width: 3, background: cfg.color, flexShrink: 0, alignSelf: 'stretch' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{event.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                            {formatDate(event.date)}{event.time ? ` · ${event.time}` : ''}
                          </div>
                          {(event as any).location && (
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>📍 {(event as any).location}</div>
                          )}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: d <= 2 ? '#b91c1c' : d <= 7 ? '#b45309' : 'var(--muted)', flexShrink: 0, alignSelf: 'center', textTransform: 'uppercase' }}>{formatRelative(event.date)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Last Meeting Actions */}
              <div className="card">
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Last Meeting</span>
                </div>
                <div style={{ padding: '12px 20px' }}>
                  {[
                    { person: 'Maga',   text: 'Begin initial prototype',        color: MEMBER_COLORS['Maga'] },
                    { person: 'Aybars', text: 'Contact NVIDIA re: collab',      color: MEMBER_COLORS['Aybars'] },
                    { person: 'Moritz', text: 'Customer outreach emails',       color: MEMBER_COLORS['Moritz'] },
                    { person: 'All',    text: 'Prepare 3–5 ideas for Friday',   color: 'var(--muted)' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: i < 3 ? '1px solid var(--line)' : 'none' }}>
                      <div style={{ width: 4, height: 4, background: item.color, marginTop: 6, flexShrink: 0, borderRadius: '50%' }} />
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: item.color }}>{item.person} </span>
                        <span style={{ fontSize: 12, color: 'var(--mid)' }}>{item.text}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 4, padding: '8px 12px', background: 'var(--blue-lt)', border: '1px solid var(--blue)', fontSize: 11, color: 'var(--blue)', fontFamily: 'var(--mono)', fontWeight: 500 }}>
                    Friday 12:00 — Idea Brainstorming
                  </div>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>

      {showAddTask  && <AddTaskModal  onAdd={addTask}  onClose={() => setShowAddTask(false)}  />}
      {showAddEvent && <AddEventModal onAdd={addEvent} onClose={() => setShowAddEvent(false)} />}
    </>
  )
}
