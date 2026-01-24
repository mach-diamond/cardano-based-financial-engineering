import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Bootstrap 4 CSS
import 'bootstrap/dist/css/bootstrap.min.css'

// Custom styles (must come after Bootstrap)
import './style.scss'

// Bootstrap 4 JS (requires jQuery and Popper)
import 'jquery'
import 'popper.js'
import 'bootstrap/dist/js/bootstrap.min.js'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
