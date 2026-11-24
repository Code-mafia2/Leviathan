import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AmbientSound } from './components/AmbientSound'
import './style.css'
import './styles/ocean.css'

createRoot(document.getElementById('root')!).render(<><App/><AmbientSound/></>)
