import type { IgrisStatus } from '../store/useIgrisStore'

// Per status: the glow/label colour (igris-app's metals: tungsten, or steel for the voice
// coming in) and the words under the mark. Kept out of IgrisCore.tsx so that file only
// exports components (fast refresh).
export const CORE: Record<IgrisStatus, { rgb: string; label: string }> = {
  idle: { rgb: '255,179,56', label: 'Standing by' },
  listening: { rgb: '56,189,248', label: 'Listening' },
  thinking: { rgb: '255,179,56', label: 'Thinking' },
  speaking: { rgb: '255,179,56', label: 'Speaking' },
}

export const coreLabel = (s: IgrisStatus) => CORE[s].label
