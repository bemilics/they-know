import type { ChecklistState } from './types'

export function toggleChecklistItem(
  state: ChecklistState,
  id: string,
  now: string = new Date().toISOString()
): ChecklistState {
  const current = state[id]
  if (current?.status === 'done') {
    return { ...state, [id]: { status: 'pending', doneAt: null } }
  }
  return { ...state, [id]: { status: 'done', doneAt: now } }
}

export function isChecklistItemDone(state: ChecklistState, id: string): boolean {
  return state[id]?.status === 'done'
}
