import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Member = 'Aybars' | 'Maga' | 'Moritz'

export type TaskStatus = 'todo' | 'inprogress' | 'done'

export interface Task {
  id: string
  title: string
  description?: string
  assignee: Member
  status: TaskStatus
  deadline?: string
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  title: string
  date: string
  time?: string
  type: 'team_meeting' | 'milestone' | 'prototype_day' | 'deadline' | 'other'
  description?: string
  created_at: string
}

export interface Update {
  id: string
  author: Member
  content: string
  created_at: string
}
