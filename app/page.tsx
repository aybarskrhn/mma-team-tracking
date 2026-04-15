'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, type Task, type TaskStatus, type Member, type Event, type Update } from '@/lib/supabase'

const MEMBERS: Member[] = ['Aybars', 'Maga', 'Moritz']

const MEMBER_COLORS: Record<Member, string> = {
  Aybars: '#0065BD',
  Maga: '#22c55e',
  Moritz: '#f59e0b',
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  todo: { label: 'To Do', color: '#8a8a8a', bg: '#1f1f1f' },
  inprogress: { label: 'In Progress', color: '#0065BD', bg: '#0a1929' },
  done: { label: 'Done', color: '#22c55e', bg: '#0a1f0a' },
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  team_meeting: { label: 'Team Meeting', color: '#0065BD' },
  milestone: { label: 'Milestone', color: '#a855f7' },
  prototype_day: { label: 'Prototype Day', color: '#f59e0b' },
  deadline: { label: 'Deadline', color: '#ef4444' },
  other: { label: 'Other', color: '#8a8a8a' },
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

// ── Mini Calendar ──────────────────────────────────────────────────────────
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
    <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => setCurrent(new Date(year, month - 1))} style={{ background: 'none', border: 'none', color: '#8a8a8a', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>‹</button>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={() => setCurrent(new Date(year, month + 1))} style={{ background: 'none', border: 'none', color: '#8a8a8a', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: '#8a8a8a', fontWeight: 600, padding: '2px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
          const hasEvent = eventDates.has(day)
          return (
            <div key={i} style={{
              textAlign: 'center', fontSize: 12, padding: '4px 0',
              borderRadius: 6, position: 'relative',
              background: isToday ? '#0065BD' : 'transparent',
              color: isToday ? '#fff' : '#e0e0e0',
              fontWeight: isToday ? 600 : 400,
            }}>
              {day}
              {hasEvent && !isToday && (
                <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: '#f59e0b' }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Task Card ──────────────────────────────────────────────────────────────
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
    <div style={{
      background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10,
      padding: 14, marginBottom: 8,
      borderLeft: `3px solid ${memberColor}`,
      opacity: task.status === 'done' ? 0.65 : 1,
      transition: 'opacity 0.2s',
    }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <span style={{
          fontSize: 13, fontWeight: 500, color: task.status === 'done' ? '#8a8a8a' : '#fff',
          textDecoration: task.status === 'done' ? 'line-through' : 'none',
          flex: 1,
        }}>{task.title}</span>
        <button onClick={() => onDelete(task.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}>×</button>
      </div>
      {task.description && <p style={{ fontSize: 12, color: '#8a8a8a', marginBottom: 8 }}>{task.description}</p>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: memberColor, background: `${memberColor}18`, padding: '2px 8px', borderRadius: 20 }}>
          {task.assignee}
        </span>
        <select
          value={task.status}
          onChange={e => onStatusChange(task.id, e.target.value as TaskStatus)}
          style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}40`, borderRadius: 20, padding: '2px 8px', width: 'auto', cursor: 'pointer' }}
        >
          {statuses.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
        </select>
        {task.deadline && (
          <span style={{ fontSize: 11, color: isOverdue ? '#ef4444' : '#8a8a8a', marginLeft: 'auto' }}>
            {isOverdue ? '⚠ ' : ''}{formatRelative(task.deadline)}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Add Task Modal ─────────────────────────────────────────────────────────
function AddTaskModal({ onAdd, onClose }: { onAdd: (t: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void; onClose: () => void }) {
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440 }} className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '0.04em' }}>NEW TASK</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8a8a8a', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder="Task title *" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          <textarea placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select value={assignee} onChange={e => setAssignee(e.target.value as Member)}>
              {MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} placeholder="Deadline (optional)" />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, background: 'transparent', color: '#8a8a8a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={submit} disabled={!title.trim()} style={{ flex: 2, background: title.trim() ? '#0065BD' : '#1f1f1f', color: title.trim() ? '#fff' : '#555', border: 'none', borderRadius: 8, padding: '10px', cursor: title.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 600, transition: 'background 0.15s' }}>Add Task</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Add Event Modal ────────────────────────────────────────────────────────
function AddEventModal({ onAdd, onClose }: { onAdd: (e: Omit<Event, 'id' | 'created_at'>) => void; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [type, setType] = useState<Event['type']>('team_meeting')
  const [desc, setDesc] = useState('')

  const submit = () => {
    if (!title.trim() || !date) return
    onAdd({ title: title.trim(), date, time: time || undefined, type, description: desc.trim() || undefined })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440 }} className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '0.04em' }}>NEW EVENT</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8a8a8a', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder="Event title *" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            <input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <select value={type} onChange={e => setType(e.target.value as Event['type'])}>
            {Object.entries(EVENT_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <textarea placeholder="Notes (optional)" value={desc} onChange={e => setDesc(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, background: 'transparent', color: '#8a8a8a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={submit} disabled={!title.trim() || !date} style={{ flex: 2, background: (title.trim() && date) ? '#0065BD' : '#1f1f1f', color: (title.trim() && date) ? '#fff' : '#555', border: 'none', borderRadius: 8, padding: '10px', cursor: (title.trim() && date) ? 'pointer' : 'default', fontSize: 13, fontWeight: 600, transition: 'background 0.15s' }}>Add Event</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [updates, setUpdates] = useState<Update[]>([])
  const [activeTab, setActiveTab] = useState<'board' | 'timeline' | 'updates'>('board')
  const [filterMember, setFilterMember] = useState<Member | 'all'>('all')
  const [showAddTask, setShowAddTask] = useState(false)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [newUpdate, setNewUpdate] = useState('')
  const [updateAuthor, setUpdateAuthor] = useState<Member>('Aybars')
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(true)

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

  useEffect(() => { loadData() }, [loadData])

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
  }))

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 48, fontWeight: 800, color: '#0065BD', letterSpacing: '-0.02em' }}>MMA</div>
        <div style={{ color: '#8a8a8a', marginTop: 8, fontSize: 13 }}>Loading team tracker...</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '0 0 40px' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1f1f1f', padding: '0 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 28, color: '#0065BD', letterSpacing: '-0.02em', lineHeight: 1 }}>MMA</div>
            <div style={{ width: 1, height: 20, background: '#2a2a2a' }} />
            <div style={{ fontSize: 12, color: '#8a8a8a', fontWeight: 500 }}>TUM Venture Labs</div>
          </div>
          {!isConnected && (
            <div style={{ fontSize: 11, color: '#ef4444', background: '#1f0a0a', border: '1px solid #3a1a1a', borderRadius: 20, padding: '3px 10px' }}>
              ⚠ Supabase not connected
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            {MEMBERS.map(m => (
              <div key={m} title={m} style={{ width: 28, height: 28, borderRadius: '50%', background: MEMBER_COLORS[m], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                {m[0]}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 0' }}>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Tasks', value: stats.total, color: '#fff' },
            { label: 'In Progress', value: stats.inprogress, color: '#0065BD' },
            { label: 'Completed', value: stats.done, color: '#22c55e' },
            { label: 'Overdue', value: stats.overdue, color: stats.overdue > 0 ? '#ef4444' : '#8a8a8a' },
          ].map(s => (
            <div key={s.label} style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: '#8a8a8a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Member Progress */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {memberStats.map(m => {
            const pct = m.total > 0 ? Math.round((m.done / m.total) * 100) : 0
            return (
              <div key={m.name} style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{m.name[0]}</div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</span>
                  </div>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700, color: m.color }}>{pct}%</span>
                </div>
                <div style={{ height: 4, background: '#2a2a2a', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: m.color, borderRadius: 2, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ fontSize: 11, color: '#8a8a8a', marginTop: 6 }}>{m.done} / {m.total} tasks done</div>
              </div>
            )
          })}
        </div>

        {/* Main layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>

          {/* Left — Tasks & Updates */}
          <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: '#141414', border: '1px solid #1f1f1f', borderRadius: 10, padding: 4 }}>
              {([['board', 'Kanban Board'], ['timeline', 'Timeline'], ['updates', 'Updates']] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  flex: 1, padding: '8px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: activeTab === tab ? '#0065BD' : 'transparent',
                  color: activeTab === tab ? '#fff' : '#8a8a8a',
                  fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                }}>{label}</button>
              ))}
            </div>

            {/* Board View */}
            {activeTab === 'board' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setFilterMember('all')} style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid', borderColor: filterMember === 'all' ? '#0065BD' : '#2a2a2a', background: filterMember === 'all' ? '#0a1929' : 'transparent', color: filterMember === 'all' ? '#0065BD' : '#8a8a8a', fontSize: 12, cursor: 'pointer' }}>All</button>
                    {MEMBERS.map(m => (
                      <button key={m} onClick={() => setFilterMember(m)} style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid', borderColor: filterMember === m ? MEMBER_COLORS[m] : '#2a2a2a', background: filterMember === m ? `${MEMBER_COLORS[m]}18` : 'transparent', color: filterMember === m ? MEMBER_COLORS[m] : '#8a8a8a', fontSize: 12, cursor: 'pointer' }}>{m}</button>
                    ))}
                  </div>
                  <button onClick={() => setShowAddTask(true)} style={{ background: '#0065BD', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add Task</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {(['todo', 'inprogress', 'done'] as TaskStatus[]).map(status => {
                    const cfg = STATUS_CONFIG[status]
                    const col = filteredTasks.filter(t => t.status === status)
                    return (
                      <div key={status} style={{ background: '#0f0f0f', border: '1px solid #1f1f1f', borderRadius: 10, padding: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cfg.label}</span>
                          </div>
                          <span style={{ fontSize: 11, color: '#555', background: '#1a1a1a', padding: '1px 7px', borderRadius: 20 }}>{col.length}</span>
                        </div>
                        <div style={{ minHeight: 40 }}>
                          {col.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#333', fontSize: 12, padding: '16px 0' }}>—</div>
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

            {/* Timeline View */}
            {activeTab === 'timeline' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <button onClick={() => setShowAddEvent(true)} style={{ background: '#0065BD', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add Event</button>
                </div>
                <div style={{ position: 'relative', paddingLeft: 24 }}>
                  <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 1, background: '#1f1f1f' }} />
                  {events.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#555', padding: '40px 0', fontSize: 13 }}>No events yet — add your first one</div>
                  ) : events.map((event, i) => {
                    const cfg = EVENT_TYPE_CONFIG[event.type]
                    const d = getDaysUntil(event.date)
                    const isPast = d < 0
                    return (
                      <div key={event.id} style={{ position: 'relative', marginBottom: 16, opacity: isPast ? 0.5 : 1 }} className="fade-in">
                        <div style={{ position: 'absolute', left: -20, top: 14, width: 10, height: 10, borderRadius: '50%', background: cfg.color, border: '2px solid #0a0a0a' }} />
                        <div style={{ background: '#141414', border: `1px solid #1f1f1f`, borderRadius: 10, padding: '12px 14px', borderLeft: `3px solid ${cfg.color}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: `${cfg.color}18`, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cfg.label}</span>
                                {!isPast && d <= 3 && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>SOON</span>}
                              </div>
                              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{event.title}</div>
                              {event.description && <div style={{ fontSize: 12, color: '#8a8a8a' }}>{event.description}</div>}
                              <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
                                {formatDate(event.date)}{event.time ? ` · ${event.time}` : ''}
                                <span style={{ marginLeft: 8, color: isPast ? '#555' : '#8a8a8a' }}>{formatRelative(event.date)}</span>
                              </div>
                            </div>
                            <button onClick={() => deleteEvent(event.id)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: 14, padding: '0 2px', marginLeft: 8 }}>×</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Updates Feed */}
            {activeTab === 'updates' && (
              <div>
                <div style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <textarea
                    placeholder="Share a progress update..."
                    value={newUpdate}
                    onChange={e => setNewUpdate(e.target.value)}
                    rows={3}
                    style={{ resize: 'none', marginBottom: 10 }}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postUpdate() }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <select value={updateAuthor} onChange={e => setUpdateAuthor(e.target.value as Member)} style={{ width: 'auto', flex: 1 }}>
                      {MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <button onClick={postUpdate} disabled={!newUpdate.trim()} style={{ background: newUpdate.trim() ? '#0065BD' : '#1f1f1f', color: newUpdate.trim() ? '#fff' : '#555', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: newUpdate.trim() ? 'pointer' : 'default' }}>Post</button>
                  </div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 6 }}>Tip: Cmd+Enter to post</div>
                </div>
                {updates.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#555', padding: '40px 0', fontSize: 13 }}>No updates yet</div>
                ) : updates.map(u => (
                  <div key={u.id} style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 10, padding: '14px 16px', marginBottom: 8, borderLeft: `3px solid ${MEMBER_COLORS[u.author as Member]}` }} className="fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: MEMBER_COLORS[u.author as Member], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{u.author[0]}</div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{u.author}</span>
                      </div>
                      <span style={{ fontSize: 11, color: '#555' }}>{new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {new Date(u.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#d0d0d0', lineHeight: 1.6 }}>{u.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div>
            {/* Mini Calendar */}
            <div style={{ marginBottom: 16 }}>
              <MiniCalendar events={events} />
            </div>

            {/* Upcoming */}
            <div style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8a8a8a', marginBottom: 12 }}>Upcoming</div>
              {upcomingEvents.length === 0 ? (
                <div style={{ color: '#555', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>No upcoming events</div>
              ) : upcomingEvents.map(event => {
                const cfg = EVENT_TYPE_CONFIG[event.type]
                const d = getDaysUntil(event.date)
                return (
                  <div key={event.id} style={{ display: 'flex', gap: 10, marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #1f1f1f' }}>
                    <div style={{ width: 3, background: cfg.color, borderRadius: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#e0e0e0', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</div>
                      <div style={{ fontSize: 11, color: '#555' }}>{formatDate(event.date)}{event.time ? ` · ${event.time}` : ''}</div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: d <= 2 ? '#ef4444' : d <= 7 ? '#f59e0b' : '#555', flexShrink: 0 }}>{formatRelative(event.date)}</div>
                  </div>
                )
              })}
            </div>

            {/* Action items from last meeting */}
            <div style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 12, padding: 16 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8a8a8a', marginBottom: 12 }}>Last Meeting</div>
              {[
                { person: 'Maga', text: 'Begin initial prototype', color: MEMBER_COLORS['Maga'] },
                { person: 'Aybars', text: 'Contact NVIDIA re: collab', color: MEMBER_COLORS['Aybars'] },
                { person: 'Moritz', text: 'Customer outreach emails', color: MEMBER_COLORS['Moritz'] },
                { person: 'All', text: 'Prepare 3–5 ideas for Friday', color: '#8a8a8a' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: item.color }}>{item.person} </span>
                    <span style={{ fontSize: 12, color: '#aaa' }}>{item.text}</span>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 10, padding: '6px 10px', background: '#0a1929', border: '1px solid #0065BD30', borderRadius: 7, fontSize: 11, color: '#0065BD' }}>
                Friday 12:00 — Idea Brainstorming
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddTask && <AddTaskModal onAdd={addTask} onClose={() => setShowAddTask(false)} />}
      {showAddEvent && <AddEventModal onAdd={addEvent} onClose={() => setShowAddEvent(false)} />}
    </div>
  )
}
