import { useEffect, useRef, useState } from 'react'

const preferenceKey = 'deepsea.music.muted'

export function AmbientSound() {
  const player = useRef<HTMLAudioElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const toggle = useRef<() => void>(() => {})
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const audio = player.current!
    let disposed = false
    let muted = false
    let attempt = 0
    let frame = 0
    let fadeOnStart = false
    try { muted = localStorage.getItem(preferenceKey) === 'true' } catch { /* Storage is optional. */ }

    function removeUnlock() {
      for (const type of ['pointerup', 'click', 'keydown']) document.removeEventListener(type, unlock, true)
    }
    function unlock(event: Event) {
      if (!event.isTrusted || button.current?.contains(event.target as Node)) return
      void start()
    }
    function onPlaying() {
      removeUnlock()
      setPlaying(true)
      if (!fadeOnStart) return
      fadeOnStart = false
      cancelAnimationFrame(frame)
      const since = performance.now()
      function fade(now: number) {
        const fraction = Math.min(1, Math.max(0, (now - since) / 2000))
        audio.volume = .35 * fraction
        if (fraction < 1) frame = requestAnimationFrame(fade)
      }
      frame = requestAnimationFrame(fade)
    }
    function onPause() {
      cancelAnimationFrame(frame)
      setPlaying(false)
    }
    function onError() {
      removeUnlock()
      onPause()
      setFailed(true)
    }
    async function start() {
      if (disposed || muted || !audio.paused) return
      const current = ++attempt
      fadeOnStart = true
      audio.volume = 0
      try { await audio.play() }
      catch (error) {
        if (disposed || muted || current !== attempt) return
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          for (const type of ['pointerup', 'click', 'keydown']) document.addEventListener(type, unlock, true)
        } else if (!(error instanceof DOMException && error.name === 'AbortError')) onError()
      }
    }
    toggle.current = () => {
      muted = !audio.paused
      try { localStorage.setItem(preferenceKey, String(muted)) } catch { /* Keep the session preference. */ }
      if (muted) {
        ++attempt
        removeUnlock()
        audio.pause()
      } else void start()
    }
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('error', onError)
    queueMicrotask(() => { void start() })
    return () => {
      disposed = true
      removeUnlock()
      cancelAnimationFrame(frame)
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('error', onError)
      audio.pause()
    }
  }, [])

  const label = failed ? 'Background music unavailable' : playing ? 'Mute background music' : 'Play background music'
  return <>
    <audio ref={player} loop preload="none" src={import.meta.env.BASE_URL + 'assets/audio/dragon.mp3'}/>
    <button ref={button} className="ambient-toggle" type="button" aria-label={label} title={label}
      disabled={failed} onClick={() => toggle.current()}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9h4l5-4v14l-5-4H3z"/>
        {playing ? <path d="M15 8q4 4 0 8m3-11q7 7 0 14"/> : <path d="m16 9 6 6m0-6-6 6"/>}
      </svg>
    </button>
  </>
}
