/**
 * TIMEPLUS OS — Universal Hash Router (100% 404-Proof on Vercel & Any Host)
 * Client-Side SPA Navigation with Browser History Support
 */

class TimePlusRouter {
  constructor() {
    this.routes = {};
    this.currentRoute = '';
    window.addEventListener('hashchange', () => this.handleRouting());
    window.addEventListener('load', () => this.handleRouting());
  }

  register(route, handler) {
    this.routes[route.toLowerCase()] = handler;
  }

  navigate(route) {
    const clean = route.replace(/^#\/?/, '').trim();
    window.location.hash = '#/' + clean;
  }

  handleRouting() {
    const rawHash = window.location.hash || '#/inicio';
    let path = rawHash.replace(/^#\/?/, '').split('?')[0].trim().toLowerCase();
    if (!path) path = 'inicio';

    this.currentRoute = path;
    const handler = this.routes[path] || this.routes['*'] || this.routes['hoy'];

    if (handler) {
      handler(path);
    }

    // Actualizar botones de navegación activos
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      const target = item.getAttribute('data-route') || '';
      if (target.toLowerCase() === path) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Desplazar arriba
    window.scrollTo(0, 0);
  }
}

window.timeplusRouter = new TimePlusRouter();
