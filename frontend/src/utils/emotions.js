export const EMOTION_META = {
  joy:      { label: 'Joy',      emoji: '✨', color: '#fbbf24', bg: 'bg-emotion-joy' },
  sadness:  { label: 'Sadness',  emoji: '💙', color: '#60a5fa', bg: 'bg-emotion-sadness' },
  anger:    { label: 'Anger',    emoji: '🔥', color: '#f87171', bg: 'bg-emotion-anger' },
  fear:     { label: 'Fear',     emoji: '🌙', color: '#c084fc', bg: 'bg-emotion-fear' },
  disgust:  { label: 'Disgust',  emoji: '🍃', color: '#4ade80', bg: 'bg-emotion-disgust' },
  surprise: { label: 'Surprise', emoji: '⚡', color: '#fb923c', bg: 'bg-emotion-surprise' },
  neutral:  { label: 'Neutral',  emoji: '🌫️', color: '#94a3b8', bg: 'bg-emotion-neutral' },
}

export const getEmotionMeta = (emotion) =>
  EMOTION_META[emotion] ?? EMOTION_META.neutral

export const distressLabel = (score) => {
  if (score >= 0.75) return { label: 'Critical', color: '#f87171' }
  if (score >= 0.55) return { label: 'High',     color: '#fbbf24' }
  if (score >= 0.35) return { label: 'Moderate', color: '#fb923c' }
  return { label: 'Low', color: '#34d399' }
}

export const formatTime = (iso) => {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export const formatDate = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
